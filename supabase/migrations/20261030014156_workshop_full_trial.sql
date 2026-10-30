-- No existing organization is enrolled or changed by this migration.
CREATE SCHEMA IF NOT EXISTS motomanager_private;
CREATE TABLE motomanager_private.workshop_trial_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  converted_at timestamptz
);
CREATE TABLE motomanager_private.trial_signup_attempts (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
CREATE TABLE motomanager_private.workshop_subscription_payments (
  transaction_id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  plan text NOT NULL, cycle text NOT NULL, amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE motomanager_private.workshop_trial_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.trial_signup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.workshop_subscription_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA motomanager_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA motomanager_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA motomanager_private TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT(id,email) ON auth.users TO service_role;
GRANT ALL ON motomanager_private.workshop_trial_claims, motomanager_private.trial_signup_attempts,
  motomanager_private.workshop_subscription_payments TO service_role;

CREATE OR REPLACE FUNCTION public.claim_trial_signup_attempt(p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n integer;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  INSERT INTO motomanager_private.trial_signup_attempts AS a(key) VALUES(p_key)
  ON CONFLICT(key) DO UPDATE SET
    attempts=CASE WHEN a.window_start < now()-interval '1 hour' THEN 1 ELSE a.attempts+1 END,
    window_start=CASE WHEN a.window_start < now()-interval '1 hour' THEN now() ELSE a.window_start END
  RETURNING attempts INTO n;
  DELETE FROM motomanager_private.trial_signup_attempts WHERE window_start < now()-interval '2 days';
  RETURN n <= 5;
END $$;

-- The owner identity is supplied ONLY by the trusted server after Auth creates
-- or authenticates the account. Plan and dates cannot be chosen by a visitor.
CREATE OR REPLACE FUNCTION public.provision_workshop_account(
  p_owner_id uuid, p_name text, p_slug text, p_phone text,
  p_city text DEFAULT '', p_is_trial boolean DEFAULT true,
  p_plan text DEFAULT 'full', p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL, p_legal_name text DEFAULT NULL,
  p_tax_identifier text DEFAULT NULL, p_transaction_id text DEFAULT NULL,
  p_cycle text DEFAULT 'monthly', p_amount numeric DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE org_id uuid; owner_email text; starts timestamptz; ends timestamptz; phone_key text; config jsonb;
BEGIN
  SELECT lower(trim(email)) INTO owner_email FROM auth.users WHERE id=p_owner_id;
  IF owner_email IS NULL OR length(trim(p_name)) NOT BETWEEN 3 AND 120 OR
     p_slug !~ '^[a-z0-9-]{3,150}$' OR p_plan NOT IN ('basic','pro','full','demo') THEN
    RAISE EXCEPTION 'Invalid account' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_email, 0));
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE user_id=p_owner_id) THEN
    RAISE EXCEPTION 'Account already belongs to a workshop' USING ERRCODE='23505';
  END IF;
  phone_key=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  IF length(phone_key)=10 THEN phone_key='57'||phone_key; END IF;
  starts=CASE WHEN p_is_trial THEN now() ELSE coalesce(p_start,now()) END;
  ends=CASE WHEN p_is_trial THEN starts+interval '15 days' ELSE coalesce(p_end,starts+interval '1 month') END;
  IF p_is_trial AND (length(phone_key) NOT BETWEEN 10 AND 15 OR EXISTS(
    SELECT 1 FROM public.organizations WHERE lower(email)=owner_email OR
      regexp_replace(coalesce(phone,''),'[^0-9]','','g') IN (phone_key,right(phone_key,10))
  )) THEN RAISE EXCEPTION 'Trial already used' USING ERRCODE='23505'; END IF;
  config=jsonb_build_object('plan',CASE WHEN p_is_trial THEN 'full' ELSE p_plan END,
    'sub_plan',CASE WHEN p_is_trial THEN 'full' ELSE p_plan END,
    'isTrial',p_is_trial,'city',p_city,'billingCycle',p_cycle,
    'startDate',starts,'endDate',ends,'demoStartDate',starts,'demoEndDate',ends,
    'paidAmount',CASE WHEN p_is_trial THEN 0 ELSE p_amount END);
  IF p_is_trial THEN config=config||jsonb_build_object('trialStartDate',starts,'trialEndDate',ends); END IF;
  INSERT INTO public.organizations(name,slug,email,phone,legal_name,tax_identifier,settings)
  VALUES(trim(p_name),p_slug,owner_email,p_phone,p_legal_name,p_tax_identifier,config) RETURNING id INTO org_id;
  INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES(org_id,p_owner_id,'owner','active');
  UPDATE public.profiles SET phone=p_phone WHERE id=p_owner_id;
  IF p_is_trial THEN
    INSERT INTO motomanager_private.workshop_trial_claims(organization_id,user_id,email,phone,starts_at,ends_at)
      VALUES(org_id,p_owner_id,owner_email,phone_key,starts,ends);
  END IF;
  IF p_transaction_id IS NOT NULL THEN
    INSERT INTO motomanager_private.workshop_subscription_payments(transaction_id,organization_id,plan,cycle,amount)
      VALUES(p_transaction_id,org_id,p_plan,p_cycle,p_amount);
  END IF;
  RETURN org_id;
END $$;

CREATE OR REPLACE FUNCTION public.activate_verified_workshop_subscription(
  p_organization_id uuid,p_plan text,p_cycle text,p_amount numeric,p_transaction_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ends timestamptz; existing_org uuid;
BEGIN
  IF p_plan NOT IN ('basic','pro','full') OR p_cycle NOT IN ('monthly','biannual','yearly') OR
     p_amount <= 0 OR coalesce(length(p_transaction_id),0) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Invalid subscription payment' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown workshop' USING ERRCODE='22023'; END IF;
  SELECT organization_id INTO existing_org FROM motomanager_private.workshop_subscription_payments WHERE transaction_id=p_transaction_id;
  IF FOUND THEN
    IF existing_org=p_organization_id THEN RETURN true; END IF;
    RAISE EXCEPTION 'Payment already used' USING ERRCODE='23505';
  END IF;
  ends=now()+CASE p_cycle WHEN 'yearly' THEN interval '1 year' WHEN 'biannual' THEN interval '6 months' ELSE interval '1 month' END;
  -- Preserve any unused free days when a trial converts early.
  SELECT greatest(ends,ends+greatest(interval '0',ends_at-now())) INTO ends
    FROM motomanager_private.workshop_trial_claims WHERE organization_id=p_organization_id AND converted_at IS NULL;
  IF ends IS NULL THEN ends=now()+CASE p_cycle WHEN 'yearly' THEN interval '1 year' WHEN 'biannual' THEN interval '6 months' ELSE interval '1 month' END; END IF;
  INSERT INTO motomanager_private.workshop_subscription_payments(transaction_id,organization_id,plan,cycle,amount)
    VALUES(p_transaction_id,p_organization_id,p_plan,p_cycle,p_amount);
  UPDATE public.organizations SET status='active',settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object(
    'plan',p_plan,'sub_plan',p_plan,'isTrial',false,'billingCycle',p_cycle,
    'startDate',now(),'endDate',ends,'demoStartDate',now(),'demoEndDate',ends,
    'subscription_start_date',now(),'subscription_end_date',ends,'paidAmount',p_amount,'lastPaymentDate',now())
  WHERE id=p_organization_id;
  UPDATE motomanager_private.workshop_trial_claims SET converted_at=now() WHERE organization_id=p_organization_id AND converted_at IS NULL;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.claim_trial_signup_attempt(text),
  public.provision_workshop_account(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,text,text,text,text,numeric),
  public.activate_verified_workshop_subscription(uuid,text,text,numeric,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_signup_attempt(text),
  public.provision_workshop_account(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,text,text,text,text,numeric),
  public.activate_verified_workshop_subscription(uuid,text,text,numeric,text) TO service_role;

-- Retire the old client-callable RPC that accepted arbitrary paid plans/dates.
REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(text,text,text,text,text,text,text,text,text)
  FROM PUBLIC,anon,authenticated;

-- Private predicate used by existing tenant RLS and mutation guards. It does
-- not enumerate users or trials, and existing paid organizations are untouched.
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.organization_members WHERE organization_id=org_id AND user_id=auth.uid() AND status='active'
  ) AND NOT EXISTS(
    SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=org_id AND converted_at IS NULL AND ends_at<=now()
  );
$$;

CREATE OR REPLACE FUNCTION motomanager_private.guard_trial_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE protected_keys text[]:=ARRAY['plan','sub_plan','isTrial','trialStartDate','trialEndDate','startDate','endDate','demoStartDate','demoEndDate','subscription_start_date','subscription_end_date','paidAmount','lastPaymentDate']; old_values jsonb; new_values jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')='service_role' THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND (raw_app_meta_data->>'is_super_admin'='true' OR lower(email) IN ('juanurian31@gmail.com','mivraadmin@motomanager.com.co'))) THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=OLD.id) THEN
    SELECT jsonb_object_agg(key,value) INTO old_values FROM jsonb_each(coalesce(OLD.settings,'{}'::jsonb)) WHERE key=ANY(protected_keys);
    SELECT jsonb_object_agg(key,value) INTO new_values FROM jsonb_each(coalesce(NEW.settings,'{}'::jsonb)) WHERE key=ANY(protected_keys);
    IF old_values IS DISTINCT FROM new_values OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Subscription changes require a verified payment' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_workshop_trial BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION motomanager_private.guard_trial_organization();

CREATE OR REPLACE FUNCTION motomanager_private.guard_expired_trial_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
    org_id=CASE WHEN TG_OP='DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
    IF EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=org_id AND converted_at IS NULL AND ends_at<=now()) THEN
      RAISE EXCEPTION 'Trial expired. Choose a subscription to continue.' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION motomanager_private.guard_trial_organization(),motomanager_private.guard_expired_trial_write() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables tbl USING(table_schema,table_name)
    WHERE c.table_schema='public' AND c.column_name='organization_id' AND tbl.table_type='BASE TABLE'
  LOOP
    EXECUTE format('CREATE TRIGGER block_expired_trial_writes BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION motomanager_private.guard_expired_trial_write()',t.table_name);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';

-- Superadmin manual activation also ends a trial (e.g. bank transfer confirmed
-- outside Wompi). Existing paid organizations retain their current dates.
CREATE OR REPLACE FUNCTION public.set_organization_subscription_plan(p_organization_id uuid,p_plan text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE trial_end timestamptz;
BEGIN
  IF p_organization_id IS NULL OR p_plan IS NULL OR p_plan NOT IN ('basic','pro','full') THEN
    RAISE EXCEPTION 'Invalid workshop or subscription plan' USING ERRCODE='22023';
  END IF;
  SELECT ends_at INTO trial_end FROM motomanager_private.workshop_trial_claims WHERE organization_id=p_organization_id AND converted_at IS NULL;
  UPDATE public.organizations SET settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('plan',p_plan,'sub_plan',p_plan)
    ||CASE WHEN trial_end IS NOT NULL THEN jsonb_build_object('isTrial',false,'startDate',now(),
      'endDate',greatest(now(),trial_end)+interval '1 month','demoStartDate',now(),'demoEndDate',greatest(now(),trial_end)+interval '1 month') ELSE '{}'::jsonb END
    WHERE id=p_organization_id;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE motomanager_private.workshop_trial_claims SET converted_at=now() WHERE organization_id=p_organization_id AND converted_at IS NULL;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_organization_subscription_plan(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_subscription_plan(uuid,text) TO service_role;

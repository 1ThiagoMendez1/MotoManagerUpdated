-- New registrations receive exactly 30 days. Existing claims, paused trials,
-- subscriptions and historical dates are intentionally left intact.
BEGIN;
ALTER TABLE motomanager_private.workshop_trial_claims
  ALTER COLUMN ends_at SET DEFAULT (now() + interval '30 days');

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
  ends=CASE WHEN p_is_trial THEN starts+interval '30 days' ELSE coalesce(p_end,starts+interval '1 month') END;
  IF p_is_trial AND (length(phone_key) NOT BETWEEN 10 AND 15 OR EXISTS(
    SELECT 1 FROM public.organizations WHERE lower(email)=owner_email OR
      regexp_replace(coalesce(phone,''),'[^0-9]','','g') IN (phone_key,right(phone_key,10))
  )) THEN RAISE EXCEPTION 'Trial already used' USING ERRCODE='23505'; END IF;
  config=jsonb_build_object('plan',CASE WHEN p_is_trial THEN 'full' ELSE p_plan END,
    'sub_plan',CASE WHEN p_is_trial THEN 'full' ELSE p_plan END,
    'isTrial',p_is_trial,'trialDurationDays',CASE WHEN p_is_trial THEN 30 ELSE NULL END,'city',p_city,'billingCycle',p_cycle,
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

CREATE OR REPLACE FUNCTION public.workshop_phone_auth(p_action text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c motomanager_private.workshop_phone_challenges; a motomanager_private.workshop_phone_accounts;
  k text; n integer; rate_limit integer; rate_bucket timestamptz; org uuid; slug text;
BEGIN
  IF p_action='request' THEN
    IF p_input->>'phone' !~ '^[1-9][0-9]{9,14}$' OR p_input->>'mode' NOT IN ('signup','login') OR
      p_input->>'browserHash' !~ '^[a-f0-9]{64}$' OR p_input->>'codeHash' !~ '^[a-f0-9]{64}$' OR
      p_input->>'phoneKey' !~ '^[a-f0-9]{64}$' OR p_input->>'ipKey' !~ '^[a-f0-9]{64}$' OR
      (p_input->>'mode'='signup' AND length(trim(p_input->>'workshopName')) NOT BETWEEN 3 AND 120) THEN
      RETURN jsonb_build_object('error','invalid');
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('phone-auth:'||(p_input->>'phone'),0));
    -- Count even requests that hit the cooldown, bounding database and sender abuse.
    FOREACH k IN ARRAY ARRAY['ph:'||(p_input->>'phoneKey'),'pd:'||(p_input->>'phoneKey'),'ih:'||(p_input->>'ipKey'),'global-day'] LOOP
      rate_limit=CASE WHEN k LIKE 'ph:%' THEN 5 WHEN k LIKE 'pd:%' THEN 20 WHEN k LIKE 'ih:%' THEN 20 ELSE 2000 END;
      rate_bucket=date_trunc(CASE WHEN k LIKE 'pd:%' OR k='global-day' THEN 'day' ELSE 'hour' END,now());
      INSERT INTO motomanager_private.workshop_phone_limits AS r(key,bucket) VALUES(k,rate_bucket)
        ON CONFLICT(key,bucket) DO UPDATE SET attempts=r.attempts+1 RETURNING attempts INTO n;
      IF n>rate_limit THEN RETURN jsonb_build_object('error','limited'); END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM motomanager_private.workshop_phone_challenges WHERE phone=p_input->>'phone' AND
      (created_at>now()-interval '60 seconds' OR lease_until>now())) THEN RETURN jsonb_build_object('error','limited'); END IF;
    -- A new request invalidates older codes, including delayed messages.
    UPDATE motomanager_private.workshop_phone_challenges SET expires_at=least(expires_at,now()) WHERE phone=p_input->>'phone' AND consumed_at IS NULL;
    INSERT INTO motomanager_private.workshop_phone_challenges(id,mode,phone,workshop_name,marketing,browser_hash,code_hash)
      VALUES((p_input->>'id')::uuid,p_input->>'mode',p_input->>'phone',coalesce(p_input->>'workshopName',''),coalesce((p_input->>'marketing')::boolean,false),p_input->>'browserHash',p_input->>'codeHash');
    INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind) VALUES((p_input->>'id')::uuid,p_input->>'mode','requested');
    DELETE FROM motomanager_private.workshop_phone_challenges WHERE created_at<now()-interval '1 day' AND (lease_until IS NULL OR lease_until<now());
    DELETE FROM motomanager_private.workshop_phone_limits WHERE bucket<now()-interval '2 days';
    DELETE FROM motomanager_private.workshop_phone_milestones WHERE at<now()-interval '90 days';
    RETURN jsonb_build_object('ok',true);
  ELSIF p_action='message' THEN
    UPDATE motomanager_private.workshop_phone_challenges SET message_id=p_input->>'messageId',
      accepted_at=CASE WHEN p_input->>'accepted'='true' THEN now() END,
      failed_at=CASE WHEN p_input->>'failed'='true' THEN now() END WHERE id=(p_input->>'id')::uuid RETURNING * INTO c;
    IF FOUND AND (c.accepted_at IS NOT NULL OR c.failed_at IS NOT NULL) THEN
      INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind)
        VALUES(c.id,c.mode,CASE WHEN c.accepted_at IS NOT NULL THEN 'accepted' ELSE 'failed' END) ON CONFLICT DO NOTHING;
    END IF;
    RETURN jsonb_build_object('ok',true);
  ELSIF p_action='status' THEN
    -- Called only behind the existing raw-body signature check. Ignore unknown IDs.
    UPDATE motomanager_private.workshop_phone_challenges SET
      delivered_at=CASE WHEN p_input->>'status' IN ('delivered','read') THEN coalesce(delivered_at,now()) ELSE delivered_at END,
      failed_at=CASE WHEN p_input->>'status'='failed' AND delivered_at IS NULL THEN coalesce(failed_at,now()) ELSE failed_at END
      WHERE message_id=p_input->>'messageId' RETURNING * INTO c;
    IF FOUND AND p_input->>'status' IN ('delivered','read','failed') THEN
      INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind)
        VALUES(c.id,c.mode,CASE WHEN p_input->>'status'='failed' THEN 'failed' ELSE 'delivered' END) ON CONFLICT DO NOTHING;
    END IF;
    RETURN jsonb_build_object('ok',true);
  ELSIF p_action='delivery' THEN
    SELECT * INTO c FROM motomanager_private.workshop_phone_challenges WHERE id=(p_input->>'id')::uuid AND browser_hash=p_input->>'browserHash';
    RETURN CASE WHEN NOT FOUND THEN jsonb_build_object('error','invalid') ELSE jsonb_build_object('status',CASE WHEN c.delivered_at IS NOT NULL THEN 'delivered' WHEN c.failed_at IS NOT NULL THEN 'failed' WHEN c.accepted_at IS NOT NULL THEN 'accepted' ELSE 'unknown' END) END;
  ELSIF p_action='claim' THEN
    SELECT * INTO c FROM motomanager_private.workshop_phone_challenges WHERE id=(p_input->>'id')::uuid FOR UPDATE;
    IF NOT FOUND OR c.browser_hash<>p_input->>'browserHash' OR c.consumed_at IS NOT NULL OR c.attempts>=5 THEN RETURN jsonb_build_object('error','invalid'); END IF;
    IF c.expires_at<=now() THEN RETURN jsonb_build_object('error','expired'); END IF;
    IF c.lease_until>now() THEN RETURN jsonb_build_object('error','processing'); END IF;
    IF c.code_hash<>p_input->>'codeHash' THEN
      UPDATE motomanager_private.workshop_phone_challenges SET attempts=attempts+1 WHERE id=c.id;
      RETURN jsonb_build_object('error','invalid');
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('phone-auth:'||c.phone,0));
    SELECT * INTO a FROM motomanager_private.workshop_phone_accounts WHERE phone=c.phone;
    IF NOT FOUND THEN
      IF c.mode='login' THEN RETURN jsonb_build_object('error','no_account'); END IF;
      -- No takeover of an existing email/customer/employee account by matching
      -- an unverified phone in metadata or a workshop's contact information.
      IF EXISTS(SELECT 1 FROM auth.users WHERE phone=c.phone) OR EXISTS(SELECT 1 FROM public.organizations WHERE
        regexp_replace(coalesce(phone,''),'[^0-9]','','g') IN (c.phone,right(c.phone,10))) OR
        EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE phone=c.phone) THEN RETURN jsonb_build_object('error','legacy'); END IF;
      INSERT INTO motomanager_private.workshop_phone_accounts(phone,signup_challenge) VALUES(c.phone,c.id) RETURNING * INTO a;
    END IF;
    IF c.mode='login' AND a.organization_id IS NULL THEN RETURN jsonb_build_object('error','no_account'); END IF;
    UPDATE motomanager_private.workshop_phone_challenges SET verified_at=coalesce(verified_at,now()),lease=(p_input->>'lease')::uuid,lease_until=now()+interval '60 seconds' WHERE id=c.id;
    INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind) VALUES(c.id,c.mode,'verified') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('userId',coalesce(a.user_id,a.reserved_user_id),'phone',c.phone,'workshopName',c.workshop_name,'marketing',c.marketing,'existing',a.organization_id IS NOT NULL,'mode',c.mode);
  ELSIF p_action IN ('complete','finish','release') THEN
    SELECT * INTO c FROM motomanager_private.workshop_phone_challenges WHERE id=(p_input->>'id')::uuid FOR UPDATE;
    IF NOT FOUND OR c.verified_at IS NULL OR c.lease IS NULL OR c.browser_hash<>p_input->>'browserHash' OR c.lease IS DISTINCT FROM (p_input->>'lease')::uuid OR c.lease_until<=now() OR c.consumed_at IS NOT NULL THEN RETURN jsonb_build_object('error','invalid'); END IF;
    IF p_action='release' THEN
      UPDATE motomanager_private.workshop_phone_challenges SET lease=NULL,lease_until=NULL WHERE id=c.id;
      RETURN jsonb_build_object('ok',true);
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('phone-auth:'||c.phone,0));
    SELECT * INTO a FROM motomanager_private.workshop_phone_accounts WHERE phone=c.phone FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error','invalid'); END IF;
    IF p_action='finish' THEN
      IF a.user_id IS NULL OR a.organization_id IS NULL THEN RETURN jsonb_build_object('error','invalid'); END IF;
      UPDATE motomanager_private.workshop_phone_challenges SET consumed_at=now(),lease=NULL,lease_until=NULL WHERE id=c.id;
      RETURN jsonb_build_object('ok',true);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=coalesce(a.user_id,a.reserved_user_id) AND phone=c.phone AND
      (email IS NULL OR email='') AND raw_app_meta_data->>'workshop_phone_auth'='true') THEN RETURN jsonb_build_object('error','invalid'); END IF;
    IF a.organization_id IS NOT NULL THEN
      -- Deletion/revocation never silently grants access back to the workshop.
      IF NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=a.organization_id AND user_id=a.user_id AND status='active' AND role='owner') THEN RETURN jsonb_build_object('error','legacy'); END IF;
      SELECT o.slug INTO slug FROM public.organizations o WHERE id=a.organization_id;
      RETURN jsonb_build_object('organizationId',a.organization_id,'slug',slug,'created',false);
    END IF;
    IF c.mode<>'signup' OR EXISTS(SELECT 1 FROM public.organization_members WHERE user_id=a.reserved_user_id) OR
      EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE phone=c.phone) OR
      EXISTS(SELECT 1 FROM public.organizations WHERE regexp_replace(coalesce(phone,''),'[^0-9]','','g') IN (c.phone,right(c.phone,10))) THEN RETURN jsonb_build_object('error','legacy'); END IF;
    slug=p_input->>'slug';
    IF slug !~ '^[a-z0-9-]{3,150}$' THEN RETURN jsonb_build_object('error','invalid'); END IF;
    INSERT INTO public.organizations(name,slug,phone,settings) VALUES(c.workshop_name,slug,c.phone,jsonb_build_object(
      'plan','full','sub_plan','full','isTrial',true,'trialDurationDays',30,'city','','billingCycle','monthly','paidAmount',0,
      'trialStartDate',now(),'trialEndDate',now()+interval '30 days','startDate',now(),'endDate',now()+interval '30 days',
      'demoStartDate',now(),'demoEndDate',now()+interval '30 days')) RETURNING id INTO org;
    INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES(org,a.reserved_user_id,'owner','active');
    UPDATE public.profiles SET phone=c.phone WHERE id=a.reserved_user_id;
    INSERT INTO motomanager_private.workshop_trial_claims(organization_id,user_id,email,phone) VALUES(org,a.reserved_user_id,NULL,c.phone);
    UPDATE motomanager_private.workshop_phone_accounts SET user_id=reserved_user_id,organization_id=org,signup_challenge=c.id WHERE phone=c.phone;
    INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind) VALUES(c.id,c.mode,'created') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('organizationId',org,'slug',slug,'created',true);
  END IF;
  RAISE EXCEPTION 'Unknown phone authentication operation' USING ERRCODE='22023';
END $$;

-- Preserve the server-only surface; neither visitor may choose trial dates.
REVOKE ALL ON FUNCTION public.provision_workshop_account(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,text,text,text,text,numeric),
  public.workshop_phone_auth(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.provision_workshop_account(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,text,text,text,text,numeric),
  public.workshop_phone_auth(text,jsonb) TO service_role;
COMMIT;

-- Additive phone identities. Existing accounts are never attached by an
-- unverified metadata phone, and existing password authentication is untouched.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE motomanager_private.workshop_trial_claims ALTER COLUMN email DROP NOT NULL;
CREATE TABLE motomanager_private.workshop_phone_accounts (
  phone text PRIMARY KEY CHECK(phone ~ '^[1-9][0-9]{9,14}$'),
  reserved_user_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  signup_challenge uuid NOT NULL, first_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE motomanager_private.workshop_phone_challenges (
  id uuid PRIMARY KEY, mode text NOT NULL CHECK(mode IN ('signup','login')),
  phone text NOT NULL, workshop_name text NOT NULL, marketing boolean NOT NULL DEFAULT false,
  browser_hash text NOT NULL CHECK(browser_hash ~ '^[a-f0-9]{64}$'),
  code_hash text NOT NULL CHECK(code_hash ~ '^[a-f0-9]{64}$'),
  attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  verified_at timestamptz, consumed_at timestamptz,
  lease uuid, lease_until timestamptz, message_id text UNIQUE,
  accepted_at timestamptz, delivered_at timestamptz, failed_at timestamptz
);
CREATE INDEX workshop_phone_challenges_phone ON motomanager_private.workshop_phone_challenges(phone,created_at DESC);
CREATE TABLE motomanager_private.workshop_phone_limits (
  key text NOT NULL, bucket timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 1,
  PRIMARY KEY(key,bucket)
);
-- Operational milestones only; no submitted fields, phone, IP, user or org.
CREATE TABLE motomanager_private.workshop_phone_milestones (
  challenge_id uuid NOT NULL, mode text NOT NULL CHECK(mode IN ('signup','login')),
  kind text NOT NULL CHECK(kind IN ('requested','accepted','delivered','failed','verified','created','first_order')),
  at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(challenge_id,kind)
);
CREATE INDEX workshop_phone_milestones_at ON motomanager_private.workshop_phone_milestones(at);
ALTER TABLE motomanager_private.workshop_phone_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.workshop_phone_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.workshop_phone_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE motomanager_private.workshop_phone_milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.workshop_phone_accounts,motomanager_private.workshop_phone_challenges,
  motomanager_private.workshop_phone_limits,motomanager_private.workshop_phone_milestones FROM PUBLIC,anon,authenticated;
GRANT ALL ON motomanager_private.workshop_phone_accounts,motomanager_private.workshop_phone_challenges,
  motomanager_private.workshop_phone_limits,motomanager_private.workshop_phone_milestones TO service_role;
GRANT SELECT(phone,raw_app_meta_data) ON auth.users TO service_role;

CREATE FUNCTION public.workshop_phone_auth(p_action text,p_input jsonb) RETURNS jsonb
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
      'plan','full','sub_plan','full','isTrial',true,'city','','billingCycle','monthly','paidAmount',0,
      'trialStartDate',now(),'trialEndDate',now()+interval '15 days','startDate',now(),'endDate',now()+interval '15 days',
      'demoStartDate',now(),'demoEndDate',now()+interval '15 days')) RETURNING id INTO org;
    INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES(org,a.reserved_user_id,'owner','active');
    UPDATE public.profiles SET phone=c.phone WHERE id=a.reserved_user_id;
    INSERT INTO motomanager_private.workshop_trial_claims(organization_id,user_id,email,phone) VALUES(org,a.reserved_user_id,NULL,c.phone);
    UPDATE motomanager_private.workshop_phone_accounts SET user_id=reserved_user_id,organization_id=org,signup_challenge=c.id WHERE phone=c.phone;
    INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind) VALUES(c.id,c.mode,'created') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('organizationId',org,'slug',slug,'created',true);
  END IF;
  RAISE EXCEPTION 'Unknown phone authentication operation' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION public.workshop_phone_auth(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_phone_auth(text,jsonb) TO service_role;

-- A narrowly scoped internal trigger records only the first order. It needs
-- definer rights because authenticated mechanics cannot read private identities.
CREATE FUNCTION motomanager_private.record_phone_first_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a motomanager_private.workshop_phone_accounts;
BEGIN
  UPDATE motomanager_private.workshop_phone_accounts SET first_order_at=now()
    WHERE organization_id=NEW.organization_id AND first_order_at IS NULL RETURNING * INTO a;
  IF FOUND THEN INSERT INTO motomanager_private.workshop_phone_milestones(challenge_id,mode,kind)
    VALUES(a.signup_challenge,'signup','first_order') ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION motomanager_private.record_phone_first_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_phone_trial_first_order AFTER INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION motomanager_private.record_phone_first_order();

ALTER TABLE public.web_analytics_events DROP CONSTRAINT web_analytics_trial_milestones_check;
ALTER TABLE public.web_analytics_events ADD CONSTRAINT web_analytics_trial_milestones_check CHECK (
  kind NOT IN ('form_step','form_submit','form_error') OR (
    path='/prueba-gratis' AND target IS NOT NULL AND x IS NULL AND y IS NULL AND depth IS NULL AND seconds IS NULL AND (
      (kind='form_step' AND (target='access' OR target ~ '^field_v1:(workshop|name|email|password|phone):(view|edit|valid|invalid)$' OR
        target ~ '^field_v2:(workshop|phone|code):(view|edit|valid|invalid)$' OR target ~ '^phone_v1:(request|accepted|verify|verified)$')) OR
      (kind='form_submit' AND target='activate') OR
      (kind='form_error' AND target IN ('validation','session_open','rate_limited','rate_unavailable','account_exists',
        'account_failed','trial_used','provision_failed','interrupted','connection'))
    )
  )
) NOT VALID;
ALTER TABLE public.web_analytics_events VALIDATE CONSTRAINT web_analytics_trial_milestones_check;

CREATE FUNCTION public.web_trial_phone_signup_diagnostics(p_from timestamptz,p_to timestamptz,p_channel text DEFAULT 'all',p_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<=p_from OR p_to-p_from>interval '90 days' OR
    p_channel IS NULL OR p_channel NOT IN ('all','direct','search_ai','social','referral','ads') OR
    (p_path IS NOT NULL AND p_path NOT IN ('/','/planes','/prueba-gratis','/login','/register-workshop') AND p_path !~ '^/talleres/[a-z0-9][a-z0-9-]{0,79}$') THEN
    RAISE EXCEPTION 'Invalid phone analytics range' USING ERRCODE='22023'; END IF;
  WITH events AS MATERIALIZED (
    SELECT e.session_id,e.page_id,e.kind,e.target FROM public.web_analytics_events e
      JOIN public.web_analytics_layouts l ON l.id=e.layout_id JOIN public.web_analytics_sessions s ON s.id=e.session_id
      WHERE e.created_at>=p_from AND e.created_at<p_to AND e.path='/prueba-gratis' AND l.variant LIKE 'trial-v3-phone-v1%'
        AND (p_channel='all' OR s.channel=p_channel) AND (p_path IS NULL OR e.path=p_path)
  ), nav AS (
    SELECT session_id,page_id,bool_or(kind='pageview') arrived,bool_or(kind='form_start') started,
      bool_or(target='phone_v1:request') requested,bool_or(target='phone_v1:verify') verify FROM events GROUP BY session_id,page_id
  ), milestones AS (
    SELECT kind,count(*) total FROM motomanager_private.workshop_phone_milestones WHERE mode='signup' AND at>=p_from AND at<p_to GROUP BY kind
  ), fields AS (SELECT field FROM unnest(ARRAY['workshop','phone','code']) AS f(field))
  SELECT jsonb_build_object('available',true,'firstMeasuredAt',(SELECT min(e.created_at) FROM public.web_analytics_events e
      JOIN public.web_analytics_layouts l ON l.id=e.layout_id WHERE e.path='/prueba-gratis' AND l.variant LIKE 'trial-v3-phone-v1%'),
    'visits',(SELECT count(*) FROM nav WHERE arrived),'started',(SELECT count(*) FROM nav WHERE arrived AND started),
    'requested',(SELECT count(*) FROM nav WHERE arrived AND requested),'verify',(SELECT count(*) FROM nav WHERE arrived AND verify),
    'service',coalesce((SELECT jsonb_object_agg(kind,total) FROM milestones),'{}'::jsonb),
    'fields',(SELECT jsonb_agg(jsonb_build_object('field',f.field,
      'viewed',(SELECT count(DISTINCT (session_id,page_id)) FROM events WHERE target='field_v2:'||f.field||':view'),
      'edited',(SELECT count(DISTINCT (session_id,page_id)) FROM events WHERE target='field_v2:'||f.field||':edit'),
      'valid',(SELECT count(DISTINCT (session_id,page_id)) FROM events WHERE target='field_v2:'||f.field||':valid'),
      'invalid',(SELECT count(DISTINCT (session_id,page_id)) FROM events WHERE target='field_v2:'||f.field||':invalid'))) FROM fields f)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.web_trial_phone_signup_diagnostics(timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.web_trial_phone_signup_diagnostics(timestamptz,timestamptz,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

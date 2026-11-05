\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
('aa000000-0000-4000-8000-000000000001','trial-owner@example.test'),
('aa000000-0000-4000-8000-000000000002','trial-second@example.test'),
('aa000000-0000-4000-8000-000000000003','trial-early@example.test');
SET LOCAL ROLE service_role;
SELECT public.provision_workshop_account('aa000000-0000-4000-8000-000000000001','Trial Regression','trial-regression','573009990001') AS trial_org \gset
RESET ROLE;
SELECT set_config('test.trial_org', :'trial_org', true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=current_setting('test.trial_org')::uuid AND settings->>'plan'='full' AND settings->>'isTrial'='true' AND (settings->>'paidAmount')::numeric=0) THEN RAISE EXCEPTION 'Trial must be Full and free'; END IF;
  IF NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=current_setting('test.trial_org')::uuid AND ends_at-starts_at=interval '15 days') THEN RAISE EXCEPTION 'Trial length must be exactly 15 days'; END IF;
  IF has_function_privilege('authenticated','public.provision_workshop_account(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,text,text,text,text,numeric)','EXECUTE') OR has_function_privilege('anon','public.claim_trial_signup_attempt(text)','EXECUTE') OR has_function_privilege('authenticated','public.create_organization_with_owner(text,text,text,text,text,text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Provisioning must be server-only'; END IF;
  BEGIN
    PERFORM public.provision_workshop_account('aa000000-0000-4000-8000-000000000002','Trial Reused','trial-reused','3009990001');
    RAISE EXCEPTION 'A second trial with the same normalized phone was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
GRANT SELECT,UPDATE ON public.organizations TO authenticated;
GRANT INSERT,SELECT ON public.customers TO authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.is_organization_member(current_setting('test.trial_org')::uuid) THEN RAISE EXCEPTION 'Active trial owner denied'; END IF;
  BEGIN
    UPDATE public.organizations SET settings=settings||jsonb_build_object('isTrial',false,'plan','full') WHERE id=current_setting('test.trial_org')::uuid;
    RAISE EXCEPTION 'Owner bypassed trial protection';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
UPDATE motomanager_private.workshop_trial_claims SET ends_at=now()-interval '1 second' WHERE organization_id=:'trial_org';
SELECT set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.is_organization_member(current_setting('test.trial_org')::uuid) THEN RAISE EXCEPTION 'Expired trial retained tenant access'; END IF;
  BEGIN
    INSERT INTO public.customers(organization_id,first_name,last_name) VALUES(current_setting('test.trial_org')::uuid,'Blocked','Trial');
    RAISE EXCEPTION 'Expired trial accepted a new customer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE service_role;
SELECT public.activate_verified_workshop_subscription(:'trial_org','full','monthly',119900,'trial-regression-tx');
SELECT public.activate_verified_workshop_subscription(:'trial_org','full','monthly',119900,'trial-regression-tx');
SELECT public.provision_workshop_account('aa000000-0000-4000-8000-000000000003','Trial Early','trial-early','573009990003') AS early_org \gset
SELECT public.activate_verified_workshop_subscription(:'early_org','pro','monthly',79900,'trial-early-tx');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM motomanager_private.workshop_subscription_payments WHERE transaction_id='trial-regression-tx')<>1 THEN RAISE EXCEPTION 'Payment not idempotent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE slug='trial-early' AND (settings->>'endDate')::timestamptz>=now()+interval '1 month 14 days' AND settings->>'isTrial'='false') THEN RAISE EXCEPTION 'Unused free days were lost'; END IF;
  IF EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims WHERE organization_id=current_setting('test.trial_org')::uuid AND converted_at IS NULL) THEN RAISE EXCEPTION 'Conversion did not end the trial'; END IF;
  IF NOT public.claim_trial_signup_attempt(repeat('a',64)) THEN RAISE EXCEPTION 'First attempt denied'; END IF;
  PERFORM public.claim_trial_signup_attempt(repeat('a',64)) FROM generate_series(1,4);
  IF public.claim_trial_signup_attempt(repeat('a',64)) THEN RAISE EXCEPTION 'Rate limit bypassed'; END IF;
END $$;
ROLLBACK;
\echo 'PASS: Full 15-day trial, server-only provisioning, anti-reuse, protected dates, expiry, conversion, idempotency and throttling'

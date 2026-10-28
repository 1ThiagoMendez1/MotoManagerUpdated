\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('a0000000-0000-4000-a000-000000000001','owner@fixture.test',now()),
 ('a0000000-0000-4000-a000-000000000002','mechanic-a@fixture.test',now()),
 ('a0000000-0000-4000-a000-000000000003','mechanic-b@fixture.test',now()),
 ('a0000000-0000-4000-a000-000000000004','other-workshop@fixture.test',now());
INSERT INTO public.organizations(id,name,slug) VALUES
 ('b0000000-0000-4000-a000-000000000001','Fixture A','fixture-a'),
 ('b0000000-0000-4000-a000-000000000002','Fixture B','fixture-b');
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000001','owner'),
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000002','mechanic'),
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000003','mechanic'),
 ('b0000000-0000-4000-a000-000000000002','a0000000-0000-4000-a000-000000000004','mechanic');
SELECT set_config('request.jwt.claim.sub','a0000000-0000-4000-a000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE rows_count integer; expected_total bigint; BEGIN
  SELECT count(*), max(total_count) INTO rows_count, expected_total
    FROM public.workshop_technicians('b0000000-0000-4000-a000-000000000001',0,1);
  IF rows_count <> 1 OR expected_total <> 2 THEN RAISE EXCEPTION 'Directory pagination/count mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.workshop_technicians('b0000000-0000-4000-a000-000000000001',0,1000)
    WHERE email IN ('owner@fixture.test','other-workshop@fixture.test')) THEN RAISE EXCEPTION 'Directory leaked another organization or role'; END IF;
  BEGIN
    PERFORM public.workshop_technicians('b0000000-0000-4000-a000-000000000002',0,10);
    RAISE EXCEPTION 'Cross-workshop directory accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.workshop_technicians(uuid,integer,integer)','EXECUTE') THEN RAISE EXCEPTION 'Guest directory access'; END IF;
  RAISE NOTICE 'PASS: scoped technician emails, role filtering, pagination and denial of other workshops';
END $$;
RESET ROLE;
ROLLBACK;

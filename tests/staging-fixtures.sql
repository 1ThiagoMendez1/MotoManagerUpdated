\set ON_ERROR_STOP on
BEGIN;
-- Synthetic fixtures only; domains .invalid and reserved UUIDs.
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('a0000000-0000-4000-a000-000000000001','owner-a@staging.invalid',now()),
 ('a0000000-0000-4000-a000-000000000002','mechanic-a1@staging.invalid',now()),
 ('a0000000-0000-4000-a000-000000000003','mechanic-a2@staging.invalid',now()),
 ('a0000000-0000-4000-a000-000000000004','mechanic-b@staging.invalid',now()),
 ('a0000000-0000-4000-a000-000000000005','mechanic-disabled@staging.invalid',now())
 ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles(id,first_name,last_name,status) VALUES
 ('a0000000-0000-4000-a000-000000000001','Owner','Fixture A','active'),
 ('a0000000-0000-4000-a000-000000000002','Mechanic','Fixture A1','active'),
 ('a0000000-0000-4000-a000-000000000003','Mechanic','Fixture A2','active'),
 ('a0000000-0000-4000-a000-000000000004','Mechanic','Fixture B','active'),
 ('a0000000-0000-4000-a000-000000000005','Mechanic','Inactive','active')
 ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organizations(id,name,slug) VALUES
 ('b0000000-0000-4000-a000-000000000001','MotoManager Staging A','staging-fixture-a'),
 ('b0000000-0000-4000-a000-000000000002','MotoManager Staging B','staging-fixture-b')
 ON CONFLICT (id) DO NOTHING;
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000001','owner','active'),
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000002','mechanic','active'),
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000003','mechanic','active'),
 ('b0000000-0000-4000-a000-000000000002','a0000000-0000-4000-a000-000000000004','mechanic','active'),
 ('b0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000005','mechanic','inactive')
 ON CONFLICT (organization_id,user_id) DO NOTHING;
COMMIT;

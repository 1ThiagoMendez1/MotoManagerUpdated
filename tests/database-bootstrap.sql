-- For a NEW disposable plain PostgreSQL database only. Not a production migration.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
\ir ../supabase/migrations/20260722053409_initial_schema.sql
\ir ../supabase/migrations/20260722055002_core_business.sql
\ir ../supabase/migrations/20260722055448_inventory_billing.sql
\ir ../supabase/migrations/20261022215000_membership_policy.sql
-- Minimal stock fixture uses the columns introduced by the stock refactor.
ALTER TABLE public.inventory_items ADD COLUMN track_inventory boolean NOT NULL DEFAULT true;
CREATE TABLE public.inventory_item_stock (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), item_id uuid REFERENCES public.inventory_items(id), quantity numeric NOT NULL
);
\ir ../supabase/migrations/20261022220000_dashboard_summary.sql
\ir ../supabase/migrations/20261022221000_workshop_enrollment.sql
\ir ../supabase/migrations/20261023200000_workshop_business_hours.sql
\ir ../supabase/migrations/20261023201000_mobile_otp_challenges.sql
\ir ../supabase/migrations/20261023202000_atomic_workshop_profile.sql
\ir ../supabase/migrations/20261023203000_atomic_whatsapp_quota.sql
\ir ../supabase/migrations/20261028200000_scoped_technician_directory.sql
GRANT SELECT ON public.organization_members, public.organizations TO authenticated;
\ir database-regression.sql
\ir scoped-technicians-regression.sql

-- Minimal Storage metadata fixture for the public-image migration. This is not a Storage server.
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id), name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
-- Deliberately broad fixture: the new restrictive policy must still block this bucket.
CREATE POLICY "Test legacy broad policy" ON storage.objects FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
\ir ../supabase/migrations/20261025155215_public_workshop_images.sql
\ir workshop-image-regression.sql

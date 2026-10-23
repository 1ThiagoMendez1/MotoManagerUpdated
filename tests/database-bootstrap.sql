-- For a NEW disposable plain PostgreSQL database only. Not a production migration.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
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
GRANT SELECT ON public.organization_members TO authenticated;
\ir database-regression.sql

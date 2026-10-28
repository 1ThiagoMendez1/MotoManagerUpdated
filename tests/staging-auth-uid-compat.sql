-- STAGING FIXTURE ONLY. NEVER APPLY TO PRODUCTION SUPABASE.
-- The lightweight test bootstrap does not install GoTrue and originally only
-- understood the obsolete request.jwt.claim.sub setting. PostgREST 14 sends
-- request.jwt.claims (JSON), so this fixture supports both forms.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
SELECT COALESCE(
 nullif(current_setting('request.jwt.claim.sub', true), ''),
 nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
)::uuid
$$;

-- Additive, opt-in customer enrollment. Never creates organization_members.
CREATE TABLE public.workshop_customer_accounts (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  consent_version text NOT NULL DEFAULT '2026-10-22',
  consent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id),
  UNIQUE (customer_id)
);
ALTER TABLE public.workshop_customer_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_customer_accounts FROM anon, authenticated;
GRANT SELECT ON public.workshop_customer_accounts TO authenticated;
CREATE POLICY customer_reads_own_workshop_links ON public.workshop_customer_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.public_workshop_storefront(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('name', name, 'slug', slug, 'phone', phone,
    'address', settings->>'address', 'city', settings->>'city')
  FROM public.organizations WHERE slug = p_slug AND status = 'active'
    AND settings->>'customer_enrollment_enabled' = 'true';
$$;
REVOKE ALL ON FUNCTION public.public_workshop_storefront(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_workshop_storefront(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_workshop_enrollment(p_organization_id uuid, p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid()
      AND status = 'active' AND role IN ('owner', 'admin')) THEN
    RAISE EXCEPTION 'Workshop management access required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET settings = jsonb_set(coalesce(settings, '{}'::jsonb),
    '{customer_enrollment_enabled}', to_jsonb(p_enabled)) WHERE id = p_organization_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_workshop_enrollment(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workshop_enrollment(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_workshop_as_customer(
  p_slug text, p_first_name text, p_last_name text, p_phone text, p_consent boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE org_id uuid; current_user_id uuid := auth.uid(); verified_email text;
  customer_uuid uuid; matches integer;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT lower(email) INTO verified_email FROM auth.users
    WHERE id = current_user_id AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL THEN RAISE EXCEPTION 'Verified email required' USING ERRCODE = '42501'; END IF;
  IF p_consent IS DISTINCT FROM true OR length(trim(p_first_name)) NOT BETWEEN 1 AND 80
    OR length(trim(p_last_name)) NOT BETWEEN 1 AND 100 OR p_first_name IS NULL OR p_last_name IS NULL
    OR p_phone IS NULL OR p_phone !~ '^\+?[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'Invalid registration details' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO org_id FROM public.organizations WHERE slug = p_slug AND status = 'active'
    AND settings->>'customer_enrollment_enabled' = 'true' FOR SHARE;
  IF org_id IS NULL THEN RAISE EXCEPTION 'Workshop enrollment unavailable' USING ERRCODE = '22023'; END IF;

  -- Serialize retries and double-clicks for the same account and workshop.
  PERFORM pg_advisory_xact_lock(hashtextextended(org_id::text || current_user_id::text, 0));
  SELECT customer_id INTO customer_uuid FROM public.workshop_customer_accounts
    WHERE organization_id = org_id AND user_id = current_user_id;
  IF customer_uuid IS NOT NULL THEN RETURN customer_uuid; END IF;

  SELECT count(*), min(id::text)::uuid INTO matches, customer_uuid FROM public.customers
    WHERE organization_id = org_id AND lower(email) = verified_email;
  IF matches > 1 OR EXISTS (SELECT 1 FROM public.workshop_customer_accounts WHERE customer_id = customer_uuid) THEN
    RAISE EXCEPTION 'Ask workshop staff to link your existing record' USING ERRCODE = '23505';
  END IF;
  IF matches = 0 THEN
    INSERT INTO public.customers (organization_id, first_name, last_name, phone, email)
      VALUES (org_id, trim(p_first_name), trim(p_last_name), p_phone, verified_email)
      RETURNING id INTO customer_uuid;
  END IF;
  -- Existing customer details are never overwritten by a public registration.
  INSERT INTO public.workshop_customer_accounts (organization_id, user_id, customer_id)
    VALUES (org_id, current_user_id, customer_uuid);
  RETURN customer_uuid;
END;
$$;
REVOKE ALL ON FUNCTION public.join_workshop_as_customer(text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_workshop_as_customer(text, text, text, text, boolean) TO authenticated;

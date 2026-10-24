-- QR reception inbox. Customers can request a plate association; only staff can confirm it.
-- Deployed AFTER 20261022221000_workshop_enrollment.sql
CREATE TABLE IF NOT EXISTS public.customer_intake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plate text NULL,
  suggested_brand text NULL,
  suggested_model text NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processed','dismissed')),
  motorcycle_id uuid NULL REFERENCES public.motorcycles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  processed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT intake_valid_plate CHECK (plate IS NULL OR plate ~ '^[A-Z0-9]{5,8}$'),
  CONSTRAINT intake_brand_len CHECK (suggested_brand IS NULL OR length(suggested_brand) BETWEEN 2 AND 60),
  CONSTRAINT intake_model_len CHECK (suggested_model IS NULL OR length(suggested_model) BETWEEN 1 AND 60)
);
CREATE UNIQUE INDEX IF NOT EXISTS intake_one_per_customer_plate
  ON public.customer_intake_requests(organization_id, customer_id, (coalesce(plate,'')));
CREATE INDEX IF NOT EXISTS idx_intake_pending_tenant
  ON public.customer_intake_requests(organization_id, created_at DESC)
  WHERE status = 'pending';
ALTER TABLE public.customer_intake_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_intake_requests FROM PUBLIC, anon, authenticated;

-- Existing QR enrollments are brought into the reception inbox once, never cloned.
INSERT INTO public.customer_intake_requests (organization_id, user_id, customer_id, created_at)
SELECT w.organization_id, w.user_id, w.customer_id, w.consent_at
FROM public.workshop_customer_accounts w
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.submit_customer_intake(
  p_slug text, p_plate text DEFAULT NULL,
  p_brand text DEFAULT NULL, p_model text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  owner_id uuid := auth.uid();
  org uuid;
  customer uuid;
  normalized_plate text := NULLIF(upper(regexp_replace(coalesce(p_plate,''), '[[:space:]-]', '', 'g')), '');
  brand text := NULLIF(trim(coalesce(p_brand,'')), '');
  model text := NULLIF(trim(coalesce(p_model,'')), '');
  intake_id uuid;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF normalized_plate IS NOT NULL AND normalized_plate !~ '^[A-Z0-9]{5,8}$'
     THEN RAISE EXCEPTION 'Invalid license plate' USING ERRCODE='22023'; END IF;
  IF brand IS NOT NULL AND length(brand) NOT BETWEEN 2 AND 60
     THEN RAISE EXCEPTION 'Invalid brand' USING ERRCODE='22023'; END IF;
  IF model IS NOT NULL AND length(model) NOT BETWEEN 1 AND 60
     THEN RAISE EXCEPTION 'Invalid model' USING ERRCODE='22023'; END IF;
  SELECT w.organization_id, w.customer_id INTO org, customer
  FROM public.workshop_customer_accounts w
  JOIN public.organizations o ON o.id = w.organization_id
  WHERE o.slug = p_slug AND o.status='active'
    AND w.user_id = owner_id;
  IF org IS NULL THEN RAISE EXCEPTION 'Verified workshop association required' USING ERRCODE='42501'; END IF;
  -- Limit abuse by an already linked customer. Each plate needs staff validation.
  IF (SELECT count(*) FROM public.customer_intake_requests
      WHERE organization_id = org AND user_id = owner_id) >= 8 THEN
    RAISE EXCEPTION 'Workshop intake limit reached' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.customer_intake_requests
    (organization_id, user_id, customer_id, plate, suggested_brand, suggested_model)
  VALUES (org, owner_id, customer, normalized_plate, brand, model)
  ON CONFLICT DO NOTHING RETURNING id INTO intake_id;
  IF intake_id IS NOT NULL THEN
    INSERT INTO public.notifications (organization_id, user_id, type, title, message, link, urgent, metadata)
    SELECT org, om.user_id, 'qr_customer_registered',
      'Nuevo cliente desde QR',
      'Tienes una solicitud de cliente y moto pendiente de recepción.',
      '/customers/intake', true, jsonb_build_object('request_id',intake_id)
    FROM public.organization_members om
    WHERE om.organization_id=org AND om.status='active' AND om.role IN ('owner','admin');
  ELSE
    SELECT id INTO intake_id FROM public.customer_intake_requests
    WHERE organization_id=org AND customer_id=customer
      AND coalesce(plate,'')=coalesce(normalized_plate,'') LIMIT 1;
  END IF;
  RETURN intake_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_customer_intake(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_customer_intake(text,text,text,text) TO authenticated;

-- Staff-only atomic confirmation: never let a QR enrollment reassign an existing motorcycle.
CREATE OR REPLACE FUNCTION public.confirm_customer_intake(
  p_request_id uuid, p_plate text,
  p_brand text, p_model text, p_year integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  req public.customer_intake_requests%ROWTYPE;
  normalized_plate text := upper(regexp_replace(coalesce(p_plate,''), '[[:space:]-]', '', 'g'));
  motorcycle uuid;
  existing_customer uuid;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO req FROM public.customer_intake_requests WHERE id = p_request_id FOR UPDATE;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id=req.organization_id AND user_id=actor
      AND status='active' AND role IN ('owner','admin')) THEN
    RAISE EXCEPTION 'Workshop admin required' USING ERRCODE='42501';
  END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request already resolved' USING ERRCODE='22023'; END IF;
  IF normalized_plate !~ '^[A-Z0-9]{5,8}$' OR length(trim(coalesce(p_brand,''))) NOT BETWEEN 2 AND 60
    OR length(trim(coalesce(p_model,''))) NOT BETWEEN 1 AND 60
    OR p_year IS NULL OR p_year NOT BETWEEN 1900 AND (extract(year FROM now())::integer+1) THEN
    RAISE EXCEPTION 'Invalid motorcycle details' USING ERRCODE='22023';
  END IF;
  SELECT id, customer_id INTO motorcycle, existing_customer
  FROM public.motorcycles
  WHERE organization_id=req.organization_id AND upper(license_plate)=normalized_plate
  FOR UPDATE;
  IF motorcycle IS NOT NULL AND existing_customer IS DISTINCT FROM req.customer_id THEN
    RAISE EXCEPTION 'This plate belongs to another customer. Review manually; no reassignment occurred.'
      USING ERRCODE='23505';
  END IF;
  IF motorcycle IS NULL THEN
    INSERT INTO public.motorcycles (organization_id, customer_id, license_plate, brand, model, model_year)
    VALUES (req.organization_id, req.customer_id, normalized_plate, trim(p_brand), trim(p_model), p_year)
    RETURNING id INTO motorcycle;
  END IF;
  UPDATE public.customer_intake_requests
  SET status='processed', motorcycle_id=motorcycle, plate=normalized_plate,
    processed_at=now(), processed_by=actor
  WHERE id=req.id;
  RETURN motorcycle;
END $$;
REVOKE ALL ON FUNCTION public.confirm_customer_intake(uuid,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_customer_intake(uuid,text,text,text,integer) TO authenticated;

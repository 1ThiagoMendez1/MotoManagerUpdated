-- Atomic per-workshop monthly WhatsApp counter.
-- Updating only the relevant JSON key prevents concurrent profile/hours/QR edits from being lost.
-- Must only be callable by the trusted server (service_role).
CREATE OR REPLACE FUNCTION public.reserve_workshop_whatsapp_quota(
  p_organization_id uuid, p_month text, p_limit integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  month_key text;
  current_settings jsonb;
  consumed integer;
BEGIN
  IF p_organization_id IS NULL OR p_month IS NULL OR
     p_month !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' OR
     p_limit IS NULL OR p_limit < 0 OR p_limit > 1000000 THEN
    RAISE EXCEPTION 'Invalid WhatsApp quota arguments' USING ERRCODE = '22023';
  END IF;

  month_key := 'whatsapp_count_' || p_month;
  SELECT coalesce(settings, '{}'::jsonb) INTO current_settings
    FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF current_settings ? month_key AND
     (jsonb_typeof(current_settings -> month_key) <> 'number' OR
      (current_settings ->> month_key) !~ '^[0-9]{1,9}$') THEN
    RAISE EXCEPTION 'Invalid stored WhatsApp quota' USING ERRCODE = '22023';
  END IF;

  consumed := coalesce((current_settings ->> month_key)::integer, 0);
  IF consumed >= p_limit THEN RETURN false; END IF;

  UPDATE public.organizations
    SET settings = jsonb_set(coalesce(settings, '{}'::jsonb),
      ARRAY[month_key], to_jsonb(consumed + 1), true)
    WHERE id = p_organization_id;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_workshop_whatsapp_quota(uuid,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_workshop_whatsapp_quota(uuid,text,integer)
  TO service_role;

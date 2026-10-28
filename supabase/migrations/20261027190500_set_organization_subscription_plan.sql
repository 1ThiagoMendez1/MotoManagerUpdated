-- Cambio de plan exclusivo del servidor (service_role).
-- Edita ambas claves sin reescribir el resto de settings; respeta contadores
-- mensuales, QR, horarios y cualquier edición concurrente del perfil.
CREATE OR REPLACE FUNCTION public.set_organization_subscription_plan(
  p_organization_id uuid, p_plan text
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_organization_id IS NULL OR p_plan IS NULL OR
     p_plan NOT IN ('basic', 'pro', 'full') THEN
    RAISE EXCEPTION 'Invalid workshop or subscription plan' USING ERRCODE = '22023';
  END IF;

  UPDATE public.organizations
    SET settings = coalesce(settings, '{}'::jsonb) ||
      jsonb_build_object('plan', p_plan, 'sub_plan', p_plan)
    WHERE id = p_organization_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organization_subscription_plan(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_subscription_plan(uuid,text)
  TO service_role;

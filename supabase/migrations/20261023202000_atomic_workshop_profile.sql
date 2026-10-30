-- Actualización atómica de perfil: protege business_hours y otras preferencias
-- ante modificaciones simultáneas de propietarios/administradores.
CREATE OR REPLACE FUNCTION public.update_workshop_profile_fields(
  p_organization_id uuid,
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_nit text,
  p_maps_link text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id=p_organization_id AND user_id=auth.uid()
      AND status='active' AND role='owner'
  ) THEN
    RAISE EXCEPTION 'Only workshop owners can edit profile fields' USING ERRCODE='42501';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 150 OR
     (p_phone IS NOT NULL AND length(p_phone)>40) OR
     (p_address IS NOT NULL AND length(p_address)>300) OR
     (p_city IS NOT NULL AND length(p_city)>120) OR
     (p_nit IS NOT NULL AND length(p_nit)>50) OR
     (p_maps_link IS NOT NULL AND length(p_maps_link)>500) THEN
    RAISE EXCEPTION 'Invalid workshop profile' USING ERRCODE='22023';
  END IF;
  UPDATE public.organizations
  SET name=trim(p_name),
      phone=p_phone,
      settings=coalesce(settings,'{}'::jsonb) || jsonb_build_object(
        'address',p_address,'city',p_city,'nit',p_nit,'maps_link',p_maps_link)
  WHERE id=p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workshop not found' USING ERRCODE='22023'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_workshop_profile_fields(uuid,text,text,text,text,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_workshop_profile_fields(uuid,text,text,text,text,text,text)
  TO authenticated;

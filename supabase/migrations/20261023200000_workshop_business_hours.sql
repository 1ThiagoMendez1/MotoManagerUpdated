-- Horarios por organización: actualización atómica sin sobreescribir otras preferencias.
-- No hay horario predeterminado ni cambios retroactivos a talleres existentes.
CREATE OR REPLACE FUNCTION public.set_workshop_business_hours(
  p_organization_id uuid, p_hours jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  day_key text;
  day_slots jsonb;
  slot jsonb;
  previous_close text;
  opened text;
  closed text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE user_id = auth.uid() AND organization_id = p_organization_id
       AND role IN ('owner','admin') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Workshop management access required' USING ERRCODE='42501';
  END IF;
  IF p_hours IS NULL OR jsonb_typeof(p_hours) <> 'object' OR
     (SELECT count(*) FROM jsonb_object_keys(p_hours)) <> 7 THEN
    RAISE EXCEPTION 'Invalid business hours' USING ERRCODE='22023';
  END IF;
  FOREACH day_key IN ARRAY ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] LOOP
    day_slots := p_hours -> day_key;
    IF day_slots IS NULL OR jsonb_typeof(day_slots) <> 'array' OR
       jsonb_array_length(day_slots) > 3 THEN
      RAISE EXCEPTION 'Invalid day or time slots' USING ERRCODE='22023';
    END IF;
    previous_close := NULL;
    FOR slot IN SELECT value FROM jsonb_array_elements(day_slots) LOOP
      IF jsonb_typeof(slot) <> 'object' OR
         (SELECT count(*) FROM jsonb_object_keys(slot)) <> 2 OR
         jsonb_typeof(slot->'open') <> 'string' OR
         jsonb_typeof(slot->'close') <> 'string' THEN
        RAISE EXCEPTION 'Invalid interval structure' USING ERRCODE='22023';
      END IF;
      opened := slot->>'open';
      closed := slot->>'close';
      IF opened !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR
         closed !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR
         opened >= closed OR (previous_close IS NOT NULL AND opened < previous_close) THEN
        RAISE EXCEPTION 'Invalid or overlapping interval' USING ERRCODE='22023';
      END IF;
      previous_close := closed;
    END LOOP;
  END LOOP;
  UPDATE public.organizations
  SET settings = jsonb_set(coalesce(settings, '{}'::jsonb),
    '{business_hours}', p_hours, true)
  WHERE id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workshop not found' USING ERRCODE='22023';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_workshop_business_hours(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_workshop_business_hours(uuid,jsonb) TO authenticated;

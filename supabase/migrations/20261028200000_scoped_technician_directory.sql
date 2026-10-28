-- Scoped directory in one request; never list every Auth user to find emails.
CREATE OR REPLACE FUNCTION public.workshop_technicians(
  p_organization_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 10
) RETURNS TABLE(id uuid, name text, email text, phone text, avatar_url text, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Workshop access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT p.id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Técnico'),
    u.email::text, coalesce(p.phone, ''), p.avatar_path, count(*) OVER ()
  FROM public.organization_members m
  JOIN public.profiles p ON p.id = m.user_id
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = p_organization_id AND m.status = 'active'
    AND m.role = 'mechanic' AND p.status = 'active'
  ORDER BY p.first_name, p.last_name, p.id
  OFFSET greatest(coalesce(p_offset, 0), 0) LIMIT least(1000, greatest(coalesce(p_limit, 10), 1));
END;
$$;
REVOKE ALL ON FUNCTION public.workshop_technicians(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workshop_technicians(uuid, integer, integer) TO authenticated;

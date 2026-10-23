-- The original FOR ALL policy queries organization_members from its own policy,
-- causing infinite RLS recursion even for legitimate profile reads.
CREATE OR REPLACE FUNCTION public.is_organization_manager(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
      AND status = 'active' AND role IN ('owner', 'admin'));
$$;
REVOKE ALL ON FUNCTION public.is_organization_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_organization_manager(uuid) TO authenticated;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
CREATE POLICY "Admins can manage organization members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_organization_manager(organization_id))
  WITH CHECK (public.is_organization_manager(organization_id));

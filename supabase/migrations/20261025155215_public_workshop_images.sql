-- Only explicitly published workshop media lives here. Private profile avatars stay private.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('workshop-images', 'workshop-images', true, 2097152,
  ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=2097152,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']::text[];

-- Writes/listing use server actions only. Restrict even if an older installation has
-- a permissive storage policy. Public object downloads use the bucket's public endpoint.
CREATE POLICY "Workshop images managed by server only" ON storage.objects
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'workshop-images') WITH CHECK (bucket_id <> 'workshop-images');

CREATE OR REPLACE FUNCTION public.set_workshop_public_image(p_organization_id uuid, p_image_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id=m.organization_id
    JOIN auth.users u ON u.id=m.user_id
    WHERE m.organization_id=p_organization_id AND m.user_id=auth.uid()
      AND m.status='active' AND m.role IN ('owner','admin')
      AND o.status='active' AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Only verified workshop managers can publish images' USING ERRCODE='42501';
  END IF;
  IF p_image_path IS NOT NULL AND (
    p_image_path !~ ('^' || p_organization_id::text || '/[a-f0-9-]{36}\.(jpg|png|webp)$') OR
    NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='workshop-images' AND name=p_image_path)
  ) THEN
    RAISE EXCEPTION 'Invalid workshop image' USING ERRCODE='22023';
  END IF;
  UPDATE public.organizations
    SET settings=coalesce(settings,'{}'::jsonb) || jsonb_build_object('public_image_path', p_image_path)
    WHERE id=p_organization_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_workshop_public_image(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workshop_public_image(uuid,text) TO authenticated;

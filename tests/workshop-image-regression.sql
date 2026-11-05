-- Disposable test database only. All fixtures are rolled back.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
  ('a1000000-0000-4000-a000-000000000001','image-owner@example.test',now()),
  ('a1000000-0000-4000-a000-000000000002','image-staff@example.test',now()),
  ('a1000000-0000-4000-a000-000000000003','image-unverified@example.test',null);
INSERT INTO public.organizations(id,name,slug,settings) VALUES
  ('a2000000-0000-4000-a000-000000000001','Imagen Uno','image-one',
    '{"customer_enrollment_enabled":true,"business_hours":{"monday":[]},"whatsapp_count_2026-10":5}'),
  ('a2000000-0000-4000-a000-000000000002','Imagen Dos','image-two','{}');
INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES
  ('a2000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000001','owner','active'),
  ('a2000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000002','mechanic','active'),
  ('a2000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000003','admin','active');
INSERT INTO storage.objects(bucket_id,name) VALUES
  ('workshop-images','a2000000-0000-4000-a000-000000000001/a3000000-0000-4000-a000-000000000001.png'),
  ('workshop-images','a2000000-0000-4000-a000-000000000002/a3000000-0000-4000-a000-000000000001.png');

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-a000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',
  'a2000000-0000-4000-a000-000000000001/a3000000-0000-4000-a000-000000000001.png');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='workshop-images') THEN
    RAISE EXCEPTION 'Client can list workshop images'; END IF;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES ('workshop-images','unauthorized.png');
    RAISE EXCEPTION 'Direct storage upload allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_workshop_public_image('a2000000-0000-4000-a000-000000000002',null);
    RAISE EXCEPTION 'Cross-tenant update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',
      'a2000000-0000-4000-a000-000000000002/a3000000-0000-4000-a000-000000000001.png');
    RAISE EXCEPTION 'Cross-tenant object allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',
      'a2000000-0000-4000-a000-000000000001/a3000000-0000-4000-a000-000000000099.png');
    RAISE EXCEPTION 'Nonexistent object allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT (SELECT settings @> '{"customer_enrollment_enabled":true,"business_hours":{"monday":[]},"whatsapp_count_2026-10":5}'::jsonb
    AND settings->>'public_image_path' IS NOT NULL FROM public.organizations WHERE slug='image-one') THEN
    RAISE EXCEPTION 'Image update overwrote other workshop settings'; END IF;
  IF has_function_privilege('anon','public.set_workshop_public_image(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous image update allowed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-a000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',null);
    RAISE EXCEPTION 'Mechanic changed public image';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-a000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',null);
    RAISE EXCEPTION 'Unverified account changed public image';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-a000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.set_workshop_public_image('a2000000-0000-4000-a000-000000000001',null);
RESET ROLE;
DO $$ BEGIN
  IF (SELECT settings->>'public_image_path' FROM public.organizations WHERE slug='image-one') IS NOT NULL THEN
    RAISE EXCEPTION 'Image removal failed'; END IF;
END $$;
ROLLBACK;

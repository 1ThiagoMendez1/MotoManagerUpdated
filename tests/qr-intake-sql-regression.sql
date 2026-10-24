-- Run only against isolated restored staging PostgreSQL; rolled back in runner.
DO $test$
DECLARE
  org uuid;
  actor uuid;
  customer uuid;
  request_id uuid;
  moto_id uuid;
BEGIN
  SELECT om.organization_id, om.user_id INTO org, actor
    FROM public.organization_members om
    JOIN public.organizations o ON o.id=om.organization_id
    WHERE om.role='owner' AND om.status='active' AND o.status='active'
    ORDER BY om.joined_at LIMIT 1;
  IF org IS NULL OR actor IS NULL THEN RAISE EXCEPTION 'Missing staging fixture'; END IF;
  INSERT INTO public.customers (organization_id, first_name,last_name,email,phone)
  VALUES (org,'Prueba','QR','ficticio-qr@example.test','3000000000')
  RETURNING id INTO customer;
  INSERT INTO public.workshop_customer_accounts(organization_id,user_id,customer_id)
  VALUES (org,actor,customer);
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  SELECT public.submit_customer_intake(o.slug,'ABC12D','Yamaha','FZ') INTO request_id
    FROM public.organizations o WHERE o.id=org;
  IF request_id IS NULL THEN RAISE EXCEPTION 'QR intake was not created'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customer_intake_requests
    WHERE id=request_id AND status='pending' AND plate='ABC12D')
    THEN RAISE EXCEPTION 'Missing pending request'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications n
    WHERE n.organization_id=org AND n.type='qr_customer_registered'
      AND n.metadata->>'request_id'=request_id::text)
    THEN RAISE EXCEPTION 'Staff notifications absent'; END IF;
  -- A wrong principal must NEVER process another organization's requests.
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  BEGIN
    PERFORM public.confirm_customer_intake(request_id,'ABC12D','Yamaha','FZ',2022);
    RAISE EXCEPTION 'SECURITY FAILURE: untrusted actor could confirm a motorcycle';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  moto_id := public.confirm_customer_intake(request_id,'ABC12D','Yamaha','FZ',2022);
  IF moto_id IS NULL THEN RAISE EXCEPTION 'Motorcycle not created'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.motorcycles
    WHERE id=moto_id AND organization_id=org AND customer_id=customer AND license_plate='ABC12D')
    THEN RAISE EXCEPTION 'Motorcycle assigned incorrectly'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customer_intake_requests
    WHERE id=request_id AND status='processed' AND motorcycle_id=moto_id)
    THEN RAISE EXCEPTION 'Request not marked processed'; END IF;
  RAISE NOTICE 'QR_INTAKE_ATOMIC_AND_TENANT_SECURITY_PASS';
END $test$;

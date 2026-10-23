\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('10000000-0000-0000-0000-000000000001','owner@example.test',now()),
 ('10000000-0000-0000-0000-000000000002','customer@example.test',now()),
 ('10000000-0000-0000-0000-000000000003','unverified@example.test',null),
 ('10000000-0000-0000-0000-000000000004','other@example.test',now());
INSERT INTO organizations(id,name,slug,settings) VALUES
 ('20000000-0000-0000-0000-000000000001','Taller Uno','taller-uno','{"address":"Calle 1","customer_enrollment_enabled":true}'),
 ('20000000-0000-0000-0000-000000000002','Taller Dos','taller-dos','{"customer_enrollment_enabled":true}');
INSERT INTO organization_members(organization_id,user_id,role) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner');

DO $$ DECLARE summary jsonb; cid uuid; repeated uuid; BEGIN
  -- Guest-facing output contains only the public allowlist.
  IF (SELECT count(*) FROM jsonb_object_keys(public_workshop_storefront('taller-uno'))) <> 5 THEN
    RAISE EXCEPTION 'Storefront leaked extra fields'; END IF;
  IF public_workshop_storefront('missing') IS NOT NULL THEN RAISE EXCEPTION 'Missing workshop visible'; END IF;
  IF has_function_privilege('anon','join_workshop_as_customer(text,text,text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous registration allowed'; END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
  BEGIN
    PERFORM join_workshop_as_customer('taller-uno','Ana','Pérez','3001234567',true);
    RAISE EXCEPTION 'Unverified account accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
  cid := join_workshop_as_customer('taller-uno','Ana','Pérez','3001234567',true);
  repeated := join_workshop_as_customer('taller-uno','Changed','Name','3009999999',true);
  IF cid <> repeated OR (SELECT count(*) FROM customers WHERE email='customer@example.test') <> 1 THEN
    RAISE EXCEPTION 'Duplicate registration'; END IF;
  IF (SELECT first_name FROM customers WHERE id=cid) <> 'Ana' THEN RAISE EXCEPTION 'Existing record overwritten'; END IF;
  IF EXISTS(SELECT 1 FROM organization_members WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Customer became staff'; END IF;
  BEGIN
    PERFORM set_workshop_enrollment('20000000-0000-0000-0000-000000000001',false);
    RAISE EXCEPTION 'Customer changed workshop settings';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM workshop_dashboard_summary('20000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Customer read dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM join_workshop_as_customer('taller-dos','Ana','Pérez','3001234567',false);
    RAISE EXCEPTION 'Missing consent accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
  BEGIN
    PERFORM workshop_dashboard_summary('20000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Cross-tenant dashboard read';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  INSERT INTO inventory_items(id,organization_id,name,min_quantity,quantity) VALUES
    ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Aceite',0,999),
    ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Secreto',100,0);
  INSERT INTO inventory_item_stock(item_id,quantity) VALUES ('30000000-0000-0000-0000-000000000001',0);
  INSERT INTO motorcycles(id,organization_id,customer_id,license_plate) VALUES
    ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',cid,'ABC123'),
    ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',cid,'DEF456');
  INSERT INTO work_orders(organization_id,motorcycle_id,status) VALUES
    ('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','in_progress'),
    ('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','diagnosis'),
    ('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','cancelled'),
    ('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','delivered');
  INSERT INTO sales(id,organization_id,total,payment_method,status,created_at) VALUES
    ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',100,'cash','paid',now()),
    ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',900,'cash','cancelled',now()),
    ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002',9999,'cash','paid',now());
  INSERT INTO sale_items(sale_id,item_type,inventory_item_id,description,quantity,total) VALUES
    ('40000000-0000-0000-0000-000000000001','inventory','30000000-0000-0000-0000-000000000001','Aceite',2,100),
    ('40000000-0000-0000-0000-000000000002','inventory','30000000-0000-0000-0000-000000000001','Aceite',100,900);
  summary := workshop_dashboard_summary('20000000-0000-0000-0000-000000000001');
  IF (summary->>'activeWorkOrdersCount')::int <> 2 OR (summary->>'motosEnTallerCount')::int <> 1 THEN RAISE EXCEPTION 'Wrong active orders or distinct motorcycle count'; END IF;
  IF (summary->>'ingresosMes')::numeric <> 100 THEN RAISE EXCEPTION 'Revenue counted cancellation/other tenant'; END IF;
  IF (summary->>'stockCriticoCount')::int <> 1 THEN RAISE EXCEPTION 'Stock ignored location totals or zero threshold'; END IF;
  IF jsonb_array_length(summary->'revenueData') <> 7 THEN RAISE EXCEPTION 'Missing zero-revenue days'; END IF;
  IF (SELECT sum((d->>'ingresos')::numeric) FROM jsonb_array_elements(summary->'revenueData') d) <> 100 THEN RAISE EXCEPTION 'Bad weekly total'; END IF;
  IF (summary->'topPartsData'->0->>'ventas')::numeric <> 2 THEN RAISE EXCEPTION 'Cancelled parts counted'; END IF;

  PERFORM set_workshop_enrollment('20000000-0000-0000-0000-000000000001',false);
  IF public_workshop_storefront('taller-uno') IS NOT NULL THEN RAISE EXCEPTION 'Disabled workshop still public'; END IF;
  IF (SELECT settings->>'address' FROM organizations WHERE slug='taller-uno') <> 'Calle 1' THEN RAISE EXCEPTION 'Toggle overwrote settings'; END IF;
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
  BEGIN
    PERFORM join_workshop_as_customer('taller-uno','Otra','Persona','3001234567',true);
    RAISE EXCEPTION 'Disabled enrollment accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  RAISE NOTICE 'PASS: enrollment, permissions, tenant isolation, revenue, stock, idempotency and disable checks';
END $$;

-- RLS enforcement uses the actual low-privilege role.
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.organization_members) <> 1 THEN RAISE EXCEPTION 'Membership RLS failed or recursed'; END IF;
  PERFORM public.workshop_dashboard_summary('20000000-0000-0000-0000-000000000001');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.workshop_customer_accounts) <> 1 THEN RAISE EXCEPTION 'Customer cannot see own link'; END IF;
  IF (SELECT count(*) FROM public.organization_members) <> 0 THEN RAISE EXCEPTION 'Customer can view staff memberships'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.workshop_customer_accounts) <> 0 THEN RAISE EXCEPTION 'RLS leaked another user link'; END IF;
END $$;
RESET ROLE;
ROLLBACK;

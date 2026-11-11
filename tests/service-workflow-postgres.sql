-- Run only on a disposable restored database. All fixture writes are rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE org uuid=gen_random_uuid(); actor uuid; tech uuid; customer uuid=gen_random_uuid(); moto uuid=gen_random_uuid();
  product uuid=gen_random_uuid(); location uuid=gen_random_uuid(); w uuid=gen_random_uuid(); w2 uuid=gen_random_uuid();
  invoice jsonb; replay jsonb; payment jsonb; req uuid=gen_random_uuid(); ids uuid[]; base numeric;
BEGIN
  IF current_setting('motomanager.validation',true) IS DISTINCT FROM 'isolated' OR current_database()<>'motomanager' OR NOT EXISTS(SELECT 1 FROM public.sales WHERE is_deposit) THEN RAISE EXCEPTION 'Expected a migrated disposable snapshot'; END IF;
  SELECT m.user_id INTO actor FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.role='owner' AND m.status='active' AND coalesce(o.settings->>'trialReviewPaused','false')<>'true'
      AND NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_reviews r WHERE r.organization_id=o.id AND r.status='paused')
      AND NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims c WHERE c.organization_id=o.id AND c.converted_at IS NULL AND c.ends_at<=now()) LIMIT 1;
  SELECT user_id INTO tech FROM public.organization_members WHERE role='mechanic' AND status='active' LIMIT 1;
  ASSERT actor IS NOT NULL AND tech IS NOT NULL;
  INSERT INTO public.organizations(id,name,slug,settings) VALUES(org,'Isolated workflow validation',org::text,'{"plan":"full","isTrial":false}');
  INSERT INTO public.organization_members(organization_id,user_id,role,status) VALUES(org,actor,'owner','active'),(org,tech,'mechanic','active');
  INSERT INTO public.customers(id,organization_id,first_name,last_name) VALUES(customer,org,'Cliente','Validación');
  INSERT INTO public.motorcycles(id,organization_id,customer_id,license_plate,brand,model) VALUES(moto,org,customer,'TST99Z','Moto','Validación');
  INSERT INTO public.inventory_items(id,organization_id,code,name,unit_price) VALUES(product,org,'FA-001','Filtro de aceite',80000);
  INSERT INTO public.inventory_locations(id,organization_id,name,type) VALUES(location,org,'Vitrina','storefront');
  INSERT INTO public.inventory_item_stock(item_id,location_id,quantity) VALUES(product,location,23);
  INSERT INTO public.work_orders(id,organization_id,customer_id,motorcycle_id,assigned_mechanic_id,status) VALUES(w,org,customer,moto,tech,'received'),(w2,org,customer,moto,tech,'completed');
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  ASSERT public.can_manage_workshop_finance(org,'/sales');
  ASSERT (SELECT status='diagnosis' FROM public.work_orders WHERE id=w);
  PERFORM public.record_work_order_advance(org,w,100000,'add','cash',req);
  PERFORM public.record_work_order_advance(org,w,100000,'add','cash',req);
  ASSERT (SELECT count(*)=1 AND sum(total)=100000 FROM public.sales WHERE work_order_id=w);
  BEGIN UPDATE public.work_orders SET status='delivered' WHERE id=w; ASSERT false; EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM LIKE '%venta por servicio%'; END;
  PERFORM public.change_work_order_parts(org,w,'add',product,1);
  PERFORM public.change_work_order_parts(org,w,'quote',NULL,NULL,NULL,'approved');
  PERFORM public.change_work_order_parts(org,w,'quote',NULL,NULL,NULL,'approved');
  ASSERT (SELECT quantity=22 FROM public.inventory_item_stock WHERE item_id=product);
  INSERT INTO public.work_order_services(work_order_id,description,quantity,unit_price,total) VALUES(w,'Mano de obra',1,100000,100000);
  UPDATE public.work_orders SET status='completed' WHERE id=w;
  req=gen_random_uuid();
  invoice=public.finalize_work_order_service_sale(org,w,100000,0,'cash','2026-11-10T15:00:00Z',jsonb_build_array(jsonb_build_object('inventoryItemId',product,'quantity',1,'price',80000)),req);
  ASSERT (invoice->>'invoice_total')::numeric=180000 AND (invoice->>'total')::numeric=80000 AND (invoice->>'deposit_amount')::numeric=100000;
  ASSERT (SELECT status='delivered' FROM public.work_orders WHERE id=w);
  ASSERT (SELECT quantity=22 FROM public.inventory_item_stock WHERE item_id=product);
  ASSERT (SELECT sum(total)=180000 FROM public.sales WHERE work_order_id=w);
  replay=public.finalize_work_order_service_sale(org,w,100000,0,'cash','2026-11-10T15:00:00Z','[]',req);
  ASSERT replay->>'id'=invoice->>'id';
  SELECT array_agg(id),sum(total) INTO ids,base FROM public.pending_technician_services(org,tech,'2026-11-01T05:00:00Z','2026-12-01T05:00:00Z');
  ASSERT base=100000 AND cardinality(ids)=1;
  req=gen_random_uuid();
  payment=public.settle_technician_services(org,tech,'2026-11-01T05:00:00Z','2026-12-01T05:00:00Z',40,'transfer',ids,req);
  ASSERT (payment->>'total_paid')::numeric=40000;
  ASSERT (SELECT count(*)=0 FROM public.pending_technician_services(org,tech,'2026-11-01T05:00:00Z','2026-12-01T05:00:00Z'));
  replay=public.settle_technician_services(org,tech,'2026-11-01T05:00:00Z','2026-12-01T05:00:00Z',40,'transfer',ids,req);
  ASSERT replay->>'id'=payment->>'id';
  BEGIN PERFORM public.settle_technician_services(org,tech,'2026-11-01T05:00:00Z','2026-12-01T05:00:00Z',40,'transfer',ids,gen_random_uuid()); ASSERT false; EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM LIKE '%No hay servicios%'; END;
  BEGIN UPDATE public.sale_items SET total=1 WHERE sale_id=(invoice->>'id')::uuid; ASSERT false; EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM LIKE '%facturada%'; END;
  invoice=public.finalize_work_order_service_sale(org,w2,50000,0,'wompi','2026-11-10T15:00:00Z','[]',gen_random_uuid());
  ASSERT invoice->>'status'='pending' AND (SELECT status='completed' FROM public.work_orders WHERE id=w2);
  UPDATE public.sales SET status='paid' WHERE id=(invoice->>'id')::uuid;
  ASSERT (SELECT status='delivered' FROM public.work_orders WHERE id=w2);
  RESET ROLE;
  RAISE NOTICE 'POSTGRES17_WORKFLOW_REGRESSION_PASSED';
END $$;
ROLLBACK;

-- Advances remain cash movements in sales.total; issued invoice_total is separate.
-- No money, sales, advances or historical payroll payments are deleted.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_deposit boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_total numeric(12,2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS workflow_request_id uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_payments ADD COLUMN IF NOT EXISTS settlement_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.payroll_payments ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash';
ALTER TABLE public.payroll_payments ADD COLUMN IF NOT EXISTS workflow_request_id uuid;
UPDATE public.sales SET is_deposit=true WHERE work_order_id IS NOT NULL AND
  (notes ILIKE 'Abono de orden%' OR sale_number ~* '^(SALE-)?AB-');
UPDATE public.work_orders w SET deposit_amount=greatest(coalesce(w.deposit_amount,0),
  coalesce((SELECT sum(s.total) FROM public.sales s WHERE s.work_order_id=w.id AND s.organization_id=w.organization_id AND s.is_deposit AND s.status='paid'),0),
  coalesce((substring(w.customer_observations FROM 'Abono registrado:[[:space:]]*([0-9]+(?:\.[0-9]+)?)'))::numeric,0));
UPDATE public.sales s SET technician_id=w.assigned_mechanic_id FROM public.work_orders w
  WHERE s.work_order_id=w.id AND s.organization_id=w.organization_id AND NOT s.is_deposit AND s.technician_id IS NULL;
CREATE UNIQUE INDEX sales_workflow_request_once ON public.sales(organization_id,workflow_request_id) WHERE workflow_request_id IS NOT NULL;
CREATE UNIQUE INDEX payroll_workflow_request_once ON public.payroll_payments(organization_id,workflow_request_id) WHERE workflow_request_id IS NOT NULL;
CREATE INDEX sales_workflow_order ON public.sales(organization_id,work_order_id,is_deposit,status);

CREATE FUNCTION public.can_manage_workshop_finance(p_org uuid,p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT p_path IN ('/sales','/accounting') AND auth.uid() IS NOT NULL AND public.is_organization_member(p_org) AND EXISTS(
    SELECT 1 FROM public.organization_members m WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND m.status='active' AND (
      (m.custom_permissions IS NULL AND m.role IN ('owner','admin','receptionist','recepcionista','service_advisor')) OR
      (m.custom_permissions IS NOT NULL AND (m.custom_permissions ? '*' OR m.custom_permissions ? p_path))
    )
  )
$$;
REVOKE ALL ON FUNCTION public.can_manage_workshop_finance(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_workshop_finance(uuid,text) TO authenticated,service_role;

CREATE TABLE public.payroll_payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  payroll_payment_id uuid NOT NULL REFERENCES public.payroll_payments(id),
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id),
  service_amount numeric(12,2) NOT NULL CHECK(service_amount>=0),
  paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payroll_payment_id,sale_item_id)
);
CREATE UNIQUE INDEX payroll_service_paid_once ON public.payroll_payment_items(sale_item_id) WHERE paid;
CREATE INDEX payroll_items_payment ON public.payroll_payment_items(payroll_payment_id);
CREATE INDEX payroll_items_organization ON public.payroll_payment_items(organization_id);
ALTER TABLE public.payroll_payment_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payroll_payment_items FROM PUBLIC,anon;
GRANT SELECT,INSERT ON public.payroll_payment_items TO authenticated;
GRANT ALL ON public.payroll_payment_items TO service_role;
CREATE POLICY payroll_items_read ON public.payroll_payment_items FOR SELECT TO authenticated USING(public.can_manage_workshop_finance(organization_id,'/accounting'));
CREATE POLICY payroll_items_insert ON public.payroll_payment_items FOR INSERT TO authenticated WITH CHECK(
  public.can_manage_workshop_finance(organization_id,'/accounting') AND EXISTS(SELECT 1 FROM public.payroll_payments p WHERE p.id=payroll_payment_id AND p.organization_id=payroll_payment_items.organization_id)
);
CREATE POLICY payroll_workflow_insert ON public.payroll_payments FOR INSERT TO authenticated WITH CHECK(public.can_manage_workshop_finance(organization_id,'/accounting'));

CREATE FUNCTION public.pending_technician_services(p_org uuid,p_technician uuid,p_start timestamptz,p_end timestamptz)
RETURNS TABLE(id uuid,work_order_id uuid,service_name text,total numeric,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT public.can_manage_workshop_finance(p_org,'/accounting') THEN RAISE EXCEPTION 'Acceso denegado a la nómina.' USING ERRCODE='42501'; END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end<=p_start THEN RAISE EXCEPTION 'Periodo inválido.' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT si.id,w.id,si.description,si.total,s.created_at
    FROM public.sale_items si JOIN public.sales s ON s.id=si.sale_id JOIN public.work_orders w ON w.id=s.work_order_id
    WHERE s.organization_id=p_org AND w.organization_id=p_org AND s.status='paid' AND NOT s.is_deposit AND s.sale_number IS NOT NULL
      AND coalesce(s.technician_id,w.assigned_mechanic_id)=p_technician AND si.item_type='service' AND si.total>0
      AND s.created_at>=p_start AND s.created_at<p_end
      AND NOT EXISTS(SELECT 1 FROM public.payroll_payment_items pi WHERE pi.sale_item_id=si.id AND pi.paid)
      -- Historical settlements had no per-service ledger. Respect their recorded periods.
      AND NOT EXISTS(SELECT 1 FROM public.payroll_payments p WHERE p.organization_id=p_org AND p.technician_id=p_technician
        AND p.status='paid' AND p.settlement_version=1 AND s.invoice_total IS NULL AND s.created_at<=p.created_at AND s.created_at BETWEEN p.period_start AND p.period_end)
    ORDER BY s.created_at,si.id;
END $$;

CREATE FUNCTION public.settle_technician_services(p_org uuid,p_technician uuid,p_start timestamptz,p_end timestamptz,
  p_percentage numeric,p_method text,p_service_ids uuid[],p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE payment public.payroll_payments; ids uuid[]; expected uuid[]; base numeric; amount numeric;
BEGIN
  IF NOT public.can_manage_workshop_finance(p_org,'/accounting') THEN RAISE EXCEPTION 'Acceso denegado a la nómina.' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_percentage IS NULL OR p_percentage<=0 OR p_percentage>100 OR p_percentage<>round(p_percentage,2) OR p_percentage::text IN ('NaN','Infinity','-Infinity') OR
     p_method NOT IN ('cash','transfer','nequi','daviplata','credit_card','other') THEN RAISE EXCEPTION 'Porcentaje o medio de pago inválido.' USING ERRCODE='22023'; END IF;
  -- Serialize overlapping settlements for this technician, regardless of the chosen dates.
  PERFORM 1 FROM public.organization_members WHERE organization_id=p_org AND user_id=p_technician AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El técnico no pertenece al taller.' USING ERRCODE='42501'; END IF;
  SELECT * INTO payment FROM public.payroll_payments WHERE organization_id=p_org AND workflow_request_id=p_request_id;
  IF FOUND THEN
    IF payment.technician_id<>p_technician OR payment.period_start<>p_start OR payment.period_end<>p_end OR payment.commission_percentage<>p_percentage OR payment.payment_method<>p_method THEN RAISE EXCEPTION 'Esta solicitud ya corresponde a otra liquidación.'; END IF;
    RETURN to_jsonb(payment);
  END IF;
  SELECT array_agg(t.id ORDER BY t.id),coalesce(sum(t.total),0) INTO ids,base FROM public.pending_technician_services(p_org,p_technician,p_start,p_end) t;
  SELECT array_agg(x ORDER BY x) INTO expected FROM (SELECT DISTINCT unnest(p_service_ids) x) e;
  IF coalesce(cardinality(ids),0)=0 THEN RAISE EXCEPTION 'No hay servicios pendientes de pago en este periodo.'; END IF;
  IF ids IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Los servicios pendientes cambiaron. Actualiza la lista antes de pagar.' USING ERRCODE='40001'; END IF;
  amount=round(base*p_percentage/100,2);
  INSERT INTO public.payroll_payments(organization_id,technician_id,period_start,period_end,total_services_amount,commission_percentage,total_paid,status,created_by,settlement_version,payment_method,workflow_request_id)
    VALUES(p_org,p_technician,p_start,p_end,base,p_percentage,amount,'paid',auth.uid(),2,p_method,p_request_id) RETURNING * INTO payment;
  INSERT INTO public.payroll_payment_items(organization_id,payroll_payment_id,sale_item_id,service_amount)
    SELECT p_org,payment.id,si.id,si.total FROM public.sale_items si WHERE si.id=ANY(ids);
  RETURN to_jsonb(payment);
END $$;

CREATE FUNCTION public.record_work_order_advance(p_org uuid,p_work_order uuid,p_amount numeric,p_mode text,p_method text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE w public.work_orders; entry public.sales; difference numeric; new_total numeric; observations text;
BEGIN
  IF NOT public.can_manage_workshop_finance(p_org,'/sales') THEN RAISE EXCEPTION 'No tienes permiso para registrar abonos.' USING ERRCODE='42501'; END IF;
  IF p_amount IS NULL OR p_amount<0 OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_mode NOT IN ('add','set') OR p_request_id IS NULL OR
    p_method NOT IN ('cash','transfer','nequi','daviplata','credit_card','other') THEN RAISE EXCEPTION 'Datos del abono inválidos.' USING ERRCODE='22023'; END IF;
  SELECT * INTO w FROM public.work_orders WHERE id=p_work_order AND organization_id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no existe en este taller.' USING ERRCODE='42501'; END IF;
  SELECT * INTO entry FROM public.sales WHERE organization_id=p_org AND workflow_request_id=p_request_id;
  IF FOUND THEN
    IF entry.work_order_id<>p_work_order OR NOT entry.is_deposit THEN RAISE EXCEPTION 'La solicitud ya pertenece a otro movimiento.'; END IF;
    RETURN jsonb_build_object('depositAmount',w.deposit_amount,'entryId',entry.id,'repeated',true);
  END IF;
  IF w.status IN ('delivered','delivered_quote_rejected','cancelled') OR EXISTS(
    SELECT 1 FROM public.sales s WHERE s.work_order_id=w.id AND NOT s.is_deposit AND s.sale_number IS NOT NULL AND s.status IN ('pending','paid')
  ) THEN RAISE EXCEPTION 'El servicio ya fue facturado. El abono se debe registrar antes de cerrar la venta.'; END IF;
  new_total=round(CASE WHEN p_mode='set' THEN p_amount ELSE coalesce(w.deposit_amount,0)+p_amount END,2);
  difference=new_total-coalesce(w.deposit_amount,0);
  IF difference=0 THEN RAISE EXCEPTION 'El abono no modifica el saldo de la orden.'; END IF;
  observations=trim(regexp_replace(coalesce(w.customer_observations,''),'Abono registrado:[[:space:]]*[0-9]+(?:\.[0-9]+)?[[:space:]]*','','g'));
  UPDATE public.work_orders SET deposit_amount=new_total,customer_observations=CASE WHEN new_total>0 THEN 'Abono registrado: '||new_total||CASE WHEN observations<>'' THEN E'\n'||observations ELSE '' END ELSE observations END WHERE id=w.id;
  INSERT INTO public.sales(organization_id,work_order_id,customer_id,sale_number,subtotal,total,payment_method,status,notes,created_by,is_deposit,workflow_request_id)
    VALUES(p_org,w.id,w.customer_id,'AB-'||w.order_number||'-'||p_request_id::text,difference,difference,p_method,'paid','Abono de orden #'||w.order_number,auth.uid(),true,p_request_id) RETURNING * INTO entry;
  RETURN jsonb_build_object('depositAmount',new_total,'entryId',entry.id);
END $$;

CREATE FUNCTION public.finalize_work_order_service_sale(p_org uuid,p_work_order uuid,p_labor numeric,p_discount numeric,p_method text,
  p_date timestamptz,p_items jsonb,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE w public.work_orders; invoice public.sales; item jsonb; product public.inventory_items;
  draft_ids uuid[]; stock record; service record; out_by_item jsonb; products_total numeric=0; discounted numeric;
  gross numeric; advance numeric; remaining numeric; qty numeric; price numeric; to_deduct numeric; used numeric;
  services_total numeric; labor_assigned numeric=0; service_charge numeric; line_count integer=0; index_no integer=0; number_next integer;
BEGIN
  IF NOT public.can_manage_workshop_finance(p_org,'/sales') THEN RAISE EXCEPTION 'No tienes permiso para facturar servicios.' USING ERRCODE='42501'; END IF;
  IF p_labor IS NULL OR p_labor<0 OR p_labor::text IN ('NaN','Infinity','-Infinity') OR p_discount IS NULL OR p_discount<0 OR p_discount>100 OR
    p_discount::text IN ('NaN','Infinity','-Infinity') OR p_date IS NULL OR p_request_id IS NULL OR
    p_method NOT IN ('cash','transfer','nequi','daviplata','credit_card','other','wompi') THEN RAISE EXCEPTION 'Datos de la venta inválidos.' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)>200 THEN RAISE EXCEPTION 'Lista de productos inválida.'; END IF;
  SELECT * INTO w FROM public.work_orders WHERE id=p_work_order AND organization_id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no existe en este taller.' USING ERRCODE='42501'; END IF;
  SELECT * INTO invoice FROM public.sales WHERE organization_id=p_org AND workflow_request_id=p_request_id;
  IF FOUND THEN
    IF invoice.work_order_id<>w.id OR invoice.is_deposit THEN RAISE EXCEPTION 'La solicitud pertenece a otro movimiento.'; END IF;
    RETURN to_jsonb(invoice)||jsonb_build_object('repeated',true);
  END IF;
  -- An advance must never be mistaken for a completed service invoice.
  SELECT * INTO invoice FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id AND NOT is_deposit
    AND sale_number IS NOT NULL AND status='paid' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    UPDATE public.work_orders SET status='delivered',completed_at=coalesce(completed_at,now()) WHERE id=w.id;
    RETURN to_jsonb(invoice)||jsonb_build_object('repeated',true);
  END IF;
  IF w.status<>'completed' AND NOT (w.status IN ('delivered','delivered_quote_rejected') AND EXISTS(SELECT 1 FROM public.sales WHERE work_order_id=w.id AND organization_id=p_org AND is_deposit AND status='paid')) THEN RAISE EXCEPTION 'Marca la orden como Reparado antes de registrar la venta por servicio.'; END IF;
  SELECT * INTO invoice FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id AND NOT is_deposit
    AND invoice_total IS NOT NULL AND status='pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(invoice)||jsonb_build_object('repeated',true); END IF;
  PERFORM 1 FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id FOR UPDATE;
  SELECT array_agg(id ORDER BY created_at,id) INTO draft_ids FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id
    AND (is_deposit OR (status='pending' AND invoice_total IS NULL));
  SELECT * INTO invoice FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id AND NOT is_deposit AND status='pending' AND invoice_total IS NULL ORDER BY created_at,id LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.sales(organization_id,work_order_id,customer_id,status,total,created_by)
      VALUES(p_org,w.id,w.customer_id,'pending',0,auth.uid()) RETURNING * INTO invoice;
  END IF;
  draft_ids=array_append(coalesce(draft_ids,'{}'::uuid[]),invoice.id);
  SELECT coalesce(jsonb_object_agg(x.item_id::text,x.quantity),'{}'::jsonb) INTO out_by_item FROM (
    SELECT m.item_id,greatest(0,sum(CASE WHEN m.movement_type='sale' THEN m.quantity
      WHEN m.movement_type='adjustment' AND m.to_location_id IS NOT NULL THEN -m.quantity ELSE 0 END)) quantity
    FROM public.inventory_movements m WHERE m.organization_id=p_org AND m.reference_id=ANY(draft_ids) GROUP BY m.item_id
  ) x;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF item->>'type'='service' THEN CONTINUE; END IF;
    qty=(item->>'quantity')::numeric;price=(item->>'price')::numeric;
    IF qty IS NULL OR qty<=0 OR qty<>trunc(qty) OR qty::text IN ('NaN','Infinity','-Infinity') OR price IS NULL OR price<0 OR price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Cantidad o precio de repuesto inválido.'; END IF;
    SELECT * INTO product FROM public.inventory_items WHERE id=(item->>'inventoryItemId')::uuid AND organization_id=p_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto no pertenece al taller.' USING ERRCODE='42501'; END IF;
    products_total=products_total+round(price*qty,2);
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.sale_items si WHERE si.sale_id=ANY(draft_ids) AND si.item_type='inventory'
    GROUP BY si.inventory_item_id HAVING sum(si.quantity) > coalesce((SELECT sum((j.value->>'quantity')::numeric)
      FROM jsonb_array_elements(p_items) j WHERE (j.value->>'inventoryItemId')::uuid=si.inventory_item_id AND coalesce(j.value->>'type','inventory')<>'service'),0)) THEN
    RAISE EXCEPTION 'Faltan repuestos de la orden en la factura. Recarga la orden antes de cobrar.';
  END IF;
  discounted=round(products_total*p_discount/100,2);gross=round(products_total+p_labor-discounted,2);
  advance=coalesce(w.deposit_amount,0);
  IF advance>gross THEN RAISE EXCEPTION 'Los abonos superan el valor del servicio. Corrige o devuelve el excedente antes de facturar.'; END IF;
  remaining=gross-advance;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':service-invoice',0));
  SELECT coalesce(max(substring(sale_number FROM '^VS([0-9]+)$')::integer),0)+1 INTO number_next FROM public.sales WHERE organization_id=p_org AND sale_number ~ '^VS[0-9]+$';
  PERFORM set_config('motomanager.service_checkout','active',true);
  UPDATE public.sales SET sale_number='VS'||number_next,customer_id=w.customer_id,payment_method=p_method,created_at=p_date,
    subtotal=products_total+p_labor,discount_total=discounted,total=remaining,invoice_total=gross,deposit_amount=advance,
    technician_id=w.assigned_mechanic_id,workflow_request_id=p_request_id,created_by=auth.uid(),is_deposit=false
    WHERE id=invoice.id;
  -- Consume only stock not already issued to the order by quote/part approval.
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'inventoryItemId' LOOP
    IF item->>'type'='service' THEN CONTINUE; END IF;
    SELECT * INTO product FROM public.inventory_items WHERE id=(item->>'inventoryItemId')::uuid AND organization_id=p_org;
    qty=(item->>'quantity')::numeric;price=(item->>'price')::numeric;
    used=least(qty,coalesce((out_by_item->>product.id::text)::numeric,0));
    out_by_item=jsonb_set(out_by_item,ARRAY[product.id::text],to_jsonb(greatest(0,coalesce((out_by_item->>product.id::text)::numeric,0)-used)));
    to_deduct=qty-used;
    IF coalesce(product.track_inventory,true) THEN
      FOR stock IN SELECT st.* FROM public.inventory_item_stock st JOIN public.inventory_locations l ON l.id=st.location_id
        WHERE st.item_id=product.id AND l.organization_id=p_org ORDER BY st.location_id FOR UPDATE OF st LOOP
        EXIT WHEN to_deduct<=0;
        used=least(greatest(stock.quantity,0),to_deduct);
        IF used>0 THEN
          PERFORM public.decrement_inventory(product.id,used,stock.location_id,invoice.id,auth.uid());
          to_deduct=to_deduct-used;
        END IF;
      END LOOP;
      IF to_deduct>0 THEN RAISE EXCEPTION 'Stock insuficiente para %.',product.name; END IF;
    END IF;
  END LOOP;
  -- Rebuild the final invoice once, retaining all cash-advance header records.
  DELETE FROM public.sale_items WHERE sale_id=ANY(draft_ids);
  UPDATE public.sales SET status='cancelled' WHERE id=ANY(draft_ids) AND id<>invoice.id AND NOT is_deposit;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF item->>'type'='service' THEN CONTINUE; END IF;
    SELECT * INTO product FROM public.inventory_items WHERE id=(item->>'inventoryItemId')::uuid AND organization_id=p_org;
    qty=(item->>'quantity')::numeric;price=(item->>'price')::numeric;
    INSERT INTO public.sale_items(sale_id,item_type,inventory_item_id,description,quantity,unit_price,total)
      VALUES(invoice.id,'inventory',product.id,product.name,qty,price,round(qty*price,2));
  END LOOP;
  SELECT coalesce(sum(total),0),count(*) INTO services_total,line_count FROM public.work_order_services WHERE work_order_id=w.id;
  FOR service IN SELECT * FROM public.work_order_services WHERE work_order_id=w.id ORDER BY id LOOP
    index_no=index_no+1;
    service_charge=CASE WHEN services_total>p_labor AND services_total>0 THEN round(service.total*p_labor/services_total,2) ELSE service.total END;
    IF services_total>p_labor AND index_no=line_count THEN service_charge=p_labor-labor_assigned; END IF;
    labor_assigned=labor_assigned+service_charge;
    INSERT INTO public.sale_items(sale_id,item_type,service_id,description,quantity,unit_price,total)
      VALUES(invoice.id,'service',service.service_id,service.description,service.quantity,CASE WHEN service.quantity>0 THEN service_charge/service.quantity ELSE service_charge END,service_charge);
  END LOOP;
  IF p_labor>labor_assigned THEN
    INSERT INTO public.sale_items(sale_id,item_type,description,quantity,unit_price,total)
      VALUES(invoice.id,'service','Mano de obra adicional',1,p_labor-labor_assigned,p_labor-labor_assigned);
  END IF;
  PERFORM set_config('motomanager.service_checkout','',true);
  UPDATE public.sales SET status=CASE WHEN p_method='wompi' AND remaining>0 THEN 'pending' ELSE 'paid' END WHERE id=invoice.id RETURNING * INTO invoice;
  RETURN to_jsonb(invoice);
END $$;

CREATE FUNCTION public.workflow_deliver_paid_order()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.work_order_id IS NOT NULL AND NOT NEW.is_deposit AND NEW.invoice_total IS NOT NULL AND NEW.status='paid' THEN
    UPDATE public.work_orders SET status='delivered',completed_at=coalesce(completed_at,now()),quote_status='approved'
      WHERE id=NEW.work_order_id AND organization_id=NEW.organization_id AND status<>'delivered';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER workflow_deliver_paid_order AFTER INSERT OR UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.workflow_deliver_paid_order();

CREATE FUNCTION public.workflow_order_state_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status IN ('draft','received') THEN NEW.status='diagnosis'; END IF;
    IF NEW.status NOT IN ('diagnosis','completed') THEN RAISE EXCEPTION 'La nueva orden debe iniciar en Diagnosticando o Reparado.'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status='delivered' AND NOT EXISTS(SELECT 1 FROM public.sales s WHERE s.work_order_id=NEW.id AND s.organization_id=NEW.organization_id
        AND s.status='paid' AND NOT s.is_deposit AND s.sale_number IS NOT NULL) THEN
      RAISE EXCEPTION 'La entrega se registra al cerrar la venta por servicio.';
    END IF;
    IF NEW.status NOT IN ('diagnosis','completed','delivered','cancelled') THEN RAISE EXCEPTION 'Solo puedes seleccionar Diagnosticando o Reparado.'; END IF;
    IF OLD.status IN ('delivered','delivered_quote_rejected') AND NEW.status IN ('diagnosis','completed') THEN RAISE EXCEPTION 'La orden ya fue entregada. Crea una nueva orden para otro servicio.'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER workflow_order_state_guard BEFORE INSERT OR UPDATE OF status ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.workflow_order_state_guard();
ALTER TABLE public.work_orders ALTER COLUMN status SET DEFAULT 'diagnosis';

REVOKE ALL ON FUNCTION public.pending_technician_services(uuid,uuid,timestamptz,timestamptz),
  public.settle_technician_services(uuid,uuid,timestamptz,timestamptz,numeric,text,uuid[],uuid),
  public.record_work_order_advance(uuid,uuid,numeric,text,text,uuid),
  public.finalize_work_order_service_sale(uuid,uuid,numeric,numeric,text,timestamptz,jsonb,uuid),
  public.workflow_deliver_paid_order(),public.workflow_order_state_guard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pending_technician_services(uuid,uuid,timestamptz,timestamptz),
  public.settle_technician_services(uuid,uuid,timestamptz,timestamptz,numeric,text,uuid[],uuid),
  public.record_work_order_advance(uuid,uuid,numeric,text,text,uuid),
  public.finalize_work_order_service_sale(uuid,uuid,numeric,numeric,text,timestamptz,jsonb,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Freeze billed work so later edits cannot change an already settled technician base.
CREATE FUNCTION public.workflow_billed_items_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE order_id uuid; org uuid; sale_id_value uuid;
BEGIN
  IF current_setting('motomanager.service_checkout',true)='active' THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='work_order_services' THEN
      IF OLD.work_order_id IS DISTINCT FROM NEW.work_order_id THEN RAISE EXCEPTION 'No se puede mover un servicio a otra orden.'; END IF;
    ELSE
      IF OLD.sale_id IS DISTINCT FROM NEW.sale_id THEN RAISE EXCEPTION 'No se puede mover una línea a otra factura.'; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME='work_order_services' THEN
    IF TG_OP='DELETE' THEN order_id=OLD.work_order_id; ELSE order_id=NEW.work_order_id; END IF;
  ELSE
    IF TG_OP='DELETE' THEN sale_id_value=OLD.sale_id; ELSE sale_id_value=NEW.sale_id; END IF;
    SELECT work_order_id INTO order_id FROM public.sales WHERE id=sale_id_value;
  END IF;
  IF order_id IS NOT NULL THEN
    SELECT organization_id INTO org FROM public.work_orders WHERE id=order_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.sales s WHERE s.work_order_id=order_id AND s.organization_id=org AND NOT s.is_deposit
      AND s.sale_number IS NOT NULL AND s.status IN ('paid','pending')) THEN
      RAISE EXCEPTION 'La orden ya está facturada. Sus repuestos y servicios no se pueden modificar.';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER workflow_billed_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.workflow_billed_items_guard();
CREATE TRIGGER workflow_billed_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.work_order_services
  FOR EACH ROW EXECUTE FUNCTION public.workflow_billed_items_guard();
REVOKE ALL ON FUNCTION public.workflow_billed_items_guard() FROM PUBLIC,anon;

-- The two-state workflow uses quote_status and the stock ledger, never status
-- labels, to reserve/return parts. All edits and their stock effects commit together.
CREATE FUNCTION public.change_work_order_parts(p_org uuid,p_work_order uuid,p_action text,
  p_item uuid DEFAULT NULL,p_quantity numeric DEFAULT NULL,p_line uuid DEFAULT NULL,p_quote text DEFAULT NULL,p_request uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE w public.work_orders; draft public.sales; product public.inventory_items; req public.part_requests;
  sale_ids uuid[]; entry record; stock record; destination uuid; target numeric; issued numeric; difference numeric; used numeric;
BEGIN
  IF current_user<>'service_role' AND NOT public.can_manage_workshop_finance(p_org,'/sales') THEN RAISE EXCEPTION 'No tienes permiso para gestionar repuestos y cotizaciones.' USING ERRCODE='42501'; END IF;
  SELECT * INTO w FROM public.work_orders WHERE id=p_work_order AND organization_id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no existe en este taller.' USING ERRCODE='42501'; END IF;
  IF w.status IN ('delivered','delivered_quote_rejected','cancelled') OR EXISTS(SELECT 1 FROM public.sales WHERE work_order_id=w.id AND NOT is_deposit AND sale_number IS NOT NULL AND status IN ('paid','pending')) THEN
    RAISE EXCEPTION 'La orden ya está facturada o cerrada.';
  END IF;
  IF p_action NOT IN ('add','remove','quote','fulfill','customer_quote') OR p_action IS NULL THEN RAISE EXCEPTION 'Acción inválida.'; END IF;
  IF p_action='customer_quote' AND (current_user<>'service_role' OR coalesce(w.quote_status,'pending')<>'pending' OR p_quote NOT IN ('approved','rejected')) THEN RAISE EXCEPTION 'Esta cotización ya fue respondida o no tienes permiso.'; END IF;
  IF p_action='fulfill' THEN
    SELECT * INTO req FROM public.part_requests WHERE id=p_request AND work_order_id=w.id AND organization_id=p_org FOR UPDATE;
    IF NOT FOUND OR req.status<>'pending' THEN RAISE EXCEPTION 'La solicitud no existe o ya fue procesada.'; END IF;
    p_item=req.inventory_item_id;p_quantity=req.quantity;
  END IF;
  SELECT * INTO draft FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id AND NOT is_deposit AND status='pending' AND invoice_total IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.sales(organization_id,work_order_id,customer_id,status,total,created_by) VALUES(p_org,w.id,w.customer_id,'pending',0,auth.uid()) RETURNING * INTO draft;
  END IF;
  IF p_action IN ('add','fulfill') THEN
    IF p_quantity IS NULL OR p_quantity<=0 OR p_quantity<>trunc(p_quantity) OR p_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
    SELECT * INTO product FROM public.inventory_items WHERE id=p_item AND organization_id=p_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto no pertenece al taller.' USING ERRCODE='42501'; END IF;
    INSERT INTO public.sale_items(sale_id,item_type,inventory_item_id,description,quantity,unit_price,total)
      VALUES(draft.id,'inventory',product.id,product.name,p_quantity,product.unit_price,round(p_quantity*product.unit_price,2));
  ELSIF p_action='remove' THEN
    DELETE FROM public.sale_items si USING public.sales s WHERE si.id=p_line AND s.id=si.sale_id AND s.work_order_id=w.id AND s.organization_id=p_org AND si.item_type='inventory';
    IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto no existe en esta orden.'; END IF;
  ELSIF p_action IN ('quote','customer_quote') THEN
    IF p_quote IS NULL OR p_quote NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Estado de cotización inválido.'; END IF;
    UPDATE public.work_orders SET quote_status=p_quote,quote_responded_at=CASE WHEN p_quote='pending' THEN NULL ELSE now() END WHERE id=w.id RETURNING * INTO w;
  END IF;
  SELECT array_agg(id) INTO sale_ids FROM public.sales WHERE organization_id=p_org AND work_order_id=w.id;
  FOR entry IN
    SELECT i.id,i.name,i.track_inventory,coalesce(lines.quantity,0) quantity,coalesce(moves.quantity,0) issued
    FROM public.inventory_items i
    LEFT JOIN (SELECT si.inventory_item_id,sum(si.quantity) quantity FROM public.sale_items si JOIN public.sales s ON s.id=si.sale_id WHERE s.id=ANY(sale_ids) AND s.status<>'cancelled' AND si.item_type='inventory' GROUP BY si.inventory_item_id) lines ON lines.inventory_item_id=i.id
    LEFT JOIN (SELECT m.item_id,sum(CASE WHEN m.movement_type='sale' THEN m.quantity WHEN m.movement_type='adjustment' AND m.to_location_id IS NOT NULL THEN -m.quantity ELSE 0 END) quantity FROM public.inventory_movements m WHERE m.organization_id=p_org AND m.reference_id=ANY(sale_ids) GROUP BY m.item_id) moves ON moves.item_id=i.id
    WHERE i.organization_id=p_org AND (lines.inventory_item_id IS NOT NULL OR moves.item_id IS NOT NULL) ORDER BY i.id
  LOOP
    IF entry.track_inventory=false THEN CONTINUE; END IF;
    target=CASE WHEN w.quote_status='approved' OR (w.status='completed' AND w.quote_status<>'rejected') THEN entry.quantity ELSE 0 END;
    issued=greatest(0,entry.issued);difference=target-issued;
    IF difference>0 THEN
      FOR stock IN SELECT st.* FROM public.inventory_item_stock st JOIN public.inventory_locations l ON l.id=st.location_id WHERE st.item_id=entry.id AND l.organization_id=p_org ORDER BY st.location_id FOR UPDATE OF st LOOP
        EXIT WHEN difference<=0;used=least(greatest(stock.quantity,0),difference);
        IF used>0 THEN PERFORM public.decrement_inventory(entry.id,used,stock.location_id,draft.id,auth.uid());difference=difference-used;END IF;
      END LOOP;
      IF difference>0 THEN RAISE EXCEPTION 'Stock insuficiente para %.',entry.name;END IF;
    ELSIF difference<0 THEN
      SELECT id INTO destination FROM public.inventory_locations WHERE organization_id=p_org ORDER BY (type='storefront') DESC,id LIMIT 1;
      IF destination IS NULL THEN RAISE EXCEPTION 'No hay ubicación para devolver el repuesto.'; END IF;
      INSERT INTO public.inventory_item_stock(item_id,location_id,quantity) VALUES(entry.id,destination,-difference)
        ON CONFLICT(item_id,location_id) DO UPDATE SET quantity=inventory_item_stock.quantity+excluded.quantity;
      INSERT INTO public.inventory_movements(organization_id,item_id,to_location_id,quantity,movement_type,reference_id,created_by,notes)
        VALUES(p_org,entry.id,destination,-difference,'adjustment',draft.id,auth.uid(),'Devolución de repuesto de orden');
    END IF;
  END LOOP;
  IF p_action='fulfill' THEN UPDATE public.part_requests SET status='fulfilled',fulfilled_by=auth.uid(),fulfilled_at=now() WHERE id=req.id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.change_work_order_parts(uuid,uuid,text,uuid,numeric,uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_work_order_parts(uuid,uuid,text,uuid,numeric,uuid,text,uuid) TO authenticated,service_role;

-- Preserve cancellations without allowing a settled service to be paid twice.
GRANT UPDATE(paid) ON public.payroll_payment_items TO authenticated;
CREATE POLICY payroll_items_status ON public.payroll_payment_items FOR UPDATE TO authenticated
  USING(public.can_manage_workshop_finance(organization_id,'/accounting'))
  WITH CHECK(public.can_manage_workshop_finance(organization_id,'/accounting') AND EXISTS(
    SELECT 1 FROM public.payroll_payments p WHERE p.id=payroll_payment_id AND p.organization_id=payroll_payment_items.organization_id AND payroll_payment_items.paid=(p.status='paid')));
CREATE FUNCTION public.workflow_payroll_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF OLD.settlement_version=2 AND (NEW.total_paid,NEW.total_services_amount,NEW.commission_percentage,NEW.technician_id,NEW.organization_id,NEW.period_start,NEW.period_end,NEW.payment_method)
      IS DISTINCT FROM (OLD.total_paid,OLD.total_services_amount,OLD.commission_percentage,OLD.technician_id,OLD.organization_id,OLD.period_start,OLD.period_end,OLD.payment_method) THEN
    RAISE EXCEPTION 'La liquidación registrada no puede cambiar sus valores.';
  END IF;
  UPDATE public.payroll_payment_items SET paid=(NEW.status='paid') WHERE payroll_payment_id=NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER workflow_payroll_status AFTER UPDATE ON public.payroll_payments FOR EACH ROW EXECUTE FUNCTION public.workflow_payroll_status();
REVOKE ALL ON FUNCTION public.workflow_payroll_status() FROM PUBLIC,anon;
NOTIFY pgrst,'reload schema';

CREATE FUNCTION public.workflow_deposit_kind() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.work_order_id IS NOT NULL AND (NEW.notes ILIKE 'Abono de orden%' OR NEW.sale_number ~* '^(SALE-)?AB-') THEN NEW.is_deposit=true; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER workflow_deposit_kind BEFORE INSERT OR UPDATE OF work_order_id,sale_number,notes ON public.sales FOR EACH ROW EXECUTE FUNCTION public.workflow_deposit_kind();
REVOKE ALL ON FUNCTION public.workflow_deposit_kind() FROM PUBLIC,anon;

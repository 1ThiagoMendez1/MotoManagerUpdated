-- Cost snapshots are private accounting data. No existing sale amount, payment,
-- inventory quantity or historical invoice line is changed by this migration.
CREATE TABLE motomanager_private.part_sale_costs (
  sale_item_id uuid PRIMARY KEY REFERENCES public.sale_items(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_cost numeric(12,2),
  source text NOT NULL CHECK(source IN ('inventory_at_sale','purchase_history','legacy_estimate','unknown')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK((unit_cost IS NULL AND source='unknown') OR
    (unit_cost IS NOT NULL AND unit_cost>=0 AND unit_cost::text NOT IN ('NaN','Infinity','-Infinity') AND source<>'unknown'))
);
ALTER TABLE motomanager_private.part_sale_costs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON motomanager_private.part_sale_costs FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA motomanager_private TO authenticated;
GRANT SELECT ON motomanager_private.part_sale_costs TO authenticated;
GRANT ALL ON motomanager_private.part_sale_costs TO service_role;
CREATE POLICY part_costs_accounting_read ON motomanager_private.part_sale_costs FOR SELECT TO authenticated
  USING(public.can_manage_workshop_finance(organization_id,'/accounting'));
CREATE INDEX part_costs_organization ON motomanager_private.part_sale_costs(organization_id);
CREATE INDEX parts_profit_paid_sales ON public.sales(organization_id,created_at,id)
  WHERE status='paid' AND NOT is_deposit AND sale_number IS NOT NULL;
CREATE INDEX parts_profit_sale_lines ON public.sale_items(inventory_item_id,sale_id) WHERE item_type='inventory';
CREATE INDEX parts_profit_purchase_lines ON public.purchase_items(item_id,purchase_id);
CREATE INDEX parts_profit_receipt_history ON public.inventory_movements(reference_id,item_id,created_at) WHERE movement_type='purchase';

-- Internal lookup; no direct client execution. A received purchase is historical
-- evidence; a current cost is explicitly only an estimate for legacy invoices.
CREATE FUNCTION motomanager_private.part_cost_basis(p_org uuid,p_item uuid,p_as_of timestamptz,p_historical boolean)
RETURNS TABLE(unit_cost numeric,source text) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE current_cost numeric; purchase_cost numeric;
BEGIN
  SELECT i.last_cost INTO current_cost FROM public.inventory_items i WHERE i.id=p_item AND i.organization_id=p_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto no pertenece al taller.' USING ERRCODE='42501'; END IF;
  IF NOT p_historical AND current_cost>0 AND current_cost::text NOT IN ('NaN','Infinity','-Infinity') THEN
    RETURN QUERY SELECT current_cost,'inventory_at_sale'::text; RETURN;
  END IF;
  SELECT round(sum(pi.unit_cost*pi.quantity)/nullif(sum(pi.quantity),0),2) INTO purchase_cost
    FROM public.purchase_items pi JOIN public.purchases p ON p.id=pi.purchase_id
    CROSS JOIN LATERAL (SELECT coalesce(min(m.created_at),p.updated_at) received_at FROM public.inventory_movements m
      WHERE m.reference_id=p.id AND m.item_id=p_item AND m.organization_id=p_org AND m.movement_type='purchase') receipt
    WHERE pi.item_id=p_item AND p.organization_id=p_org AND p.status='received' AND receipt.received_at<=p_as_of
      AND pi.quantity>0 AND pi.unit_cost>=0 AND pi.unit_cost::text NOT IN ('NaN','Infinity','-Infinity')
    GROUP BY p.id,receipt.received_at ORDER BY receipt.received_at DESC,p.id LIMIT 1;
  IF purchase_cost IS NOT NULL THEN RETURN QUERY SELECT purchase_cost,'purchase_history'::text;
  ELSIF p_historical AND current_cost>0 AND current_cost::text NOT IN ('NaN','Infinity','-Infinity') THEN
    RETURN QUERY SELECT current_cost,'legacy_estimate'::text;
  ELSE RETURN QUERY SELECT null::numeric,'unknown'::text;
  END IF;
END $$;
REVOKE ALL ON FUNCTION motomanager_private.part_cost_basis(uuid,uuid,timestamptz,boolean) FROM PUBLIC,anon,authenticated;

-- Backfill metadata only; existing financial lines and paid-payroll guards stay intact.
INSERT INTO motomanager_private.part_sale_costs(sale_item_id,organization_id,unit_cost,source)
  SELECT si.id,s.organization_id,c.unit_cost,c.source FROM public.sale_items si JOIN public.sales s ON s.id=si.sale_id
  CROSS JOIN LATERAL motomanager_private.part_cost_basis(s.organization_id,si.inventory_item_id,s.created_at,true) c
  WHERE si.item_type='inventory' AND si.inventory_item_id IS NOT NULL AND NOT s.is_deposit
    AND s.sale_number IS NOT NULL AND s.status IN ('paid','pending');

-- The private ledger is written by a trigger, not by caller-supplied prices.
-- A definer is required only here because operational sales roles cannot write
-- or read private costs. It checks actor/tenant and every inventory association.
CREATE FUNCTION motomanager_private.capture_part_sale_cost()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE invoice public.sales; line record; line_id uuid;
BEGIN
  IF TG_TABLE_NAME='sale_items' THEN
    IF NEW.item_type<>'inventory' OR NEW.inventory_item_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO invoice FROM public.sales WHERE id=NEW.sale_id;
    line_id=NEW.id;
  ELSE invoice=NEW;
  END IF;
  IF invoice.id IS NULL OR invoice.is_deposit OR invoice.sale_number IS NULL OR invoice.status NOT IN ('paid','pending') THEN RETURN NEW; END IF;
  IF session_user NOT IN ('postgres','supabase_admin') AND current_setting('role',true)<>'service_role' AND
      (auth.uid() IS NULL OR NOT public.is_organization_member(invoice.organization_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al taller de esta venta.' USING ERRCODE='42501';
  END IF;
  FOR line IN SELECT si.id,si.inventory_item_id FROM public.sale_items si
    WHERE si.sale_id=invoice.id AND si.item_type='inventory' AND si.inventory_item_id IS NOT NULL
      AND (line_id IS NULL OR si.id=line_id)
      AND NOT EXISTS(SELECT 1 FROM motomanager_private.part_sale_costs pc WHERE pc.sale_item_id=si.id)
  LOOP
    INSERT INTO motomanager_private.part_sale_costs(sale_item_id,organization_id,unit_cost,source)
      SELECT line.id,invoice.organization_id,b.unit_cost,b.source
      FROM motomanager_private.part_cost_basis(invoice.organization_id,line.inventory_item_id,now(),false) b
      ON CONFLICT(sale_item_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION motomanager_private.capture_part_sale_cost() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_part_sale_cost AFTER INSERT OR UPDATE OF sale_id,item_type,inventory_item_id ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION motomanager_private.capture_part_sale_cost();
CREATE TRIGGER capture_part_sale_cost AFTER INSERT OR UPDATE OF status,sale_number,invoice_total ON public.sales
  FOR EACH ROW EXECUTE FUNCTION motomanager_private.capture_part_sale_cost();

CREATE FUNCTION public.workshop_parts_profitability(p_org uuid,p_from date,p_to date,p_query text DEFAULT '',
  p_sort text DEFAULT 'profit',p_include_estimates boolean DEFAULT false,p_page integer DEFAULT 1,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb; from_time timestamptz; end_time timestamptz; days_count integer;
BEGIN
  IF NOT public.can_manage_workshop_finance(p_org,'/accounting') THEN RAISE EXCEPTION 'No tienes acceso a la rentabilidad de este taller.' USING ERRCODE='42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>365 OR NOT isfinite(p_from) OR NOT isfinite(p_to) THEN RAISE EXCEPTION 'Selecciona un periodo válido de hasta 366 días.' USING ERRCODE='22023'; END IF;
  IF p_sort IS NULL OR p_sort NOT IN ('profit','quantity','margin','revenue','stock','idle') OR p_page IS NULL OR p_page<1 OR p_page>100000 OR p_limit IS NULL OR p_limit<1 OR p_limit>100 OR p_include_estimates IS NULL OR length(coalesce(p_query,''))>100 THEN RAISE EXCEPTION 'Filtros inválidos.' USING ERRCODE='22023'; END IF;
  from_time=p_from::timestamp AT TIME ZONE 'America/Bogota';end_time=(p_to+1)::timestamp AT TIME ZONE 'America/Bogota';days_count=p_to-p_from+1;
  WITH invoices AS MATERIALIZED (
    SELECT s.id,s.work_order_id,s.created_at,greatest(coalesce(s.discount_total,0),0) discount
    FROM public.sales s WHERE s.organization_id=p_org AND s.status='paid' AND NOT s.is_deposit AND s.sale_number IS NOT NULL
      AND s.created_at>=from_time AND s.created_at<end_time
  ), lines AS (
    SELECT si.id,si.sale_id,si.item_type,si.inventory_item_id,si.quantity,si.total gross,s.created_at,s.discount,
      (si.item_type='inventory' OR s.work_order_id IS NULL) eligible
    FROM public.sale_items si JOIN invoices s ON s.id=si.sale_id
    WHERE si.quantity>0 AND si.total>=0
  ), weights AS (
    SELECT l.*,sum(CASE WHEN eligible THEN gross ELSE 0 END) OVER(PARTITION BY sale_id) eligible_gross,
      row_number() OVER(PARTITION BY sale_id,eligible ORDER BY id DESC) last_line FROM lines l
  ), rounded AS (
    SELECT w.*,CASE WHEN eligible AND eligible_gross>0 THEN round(least(discount,eligible_gross)*gross/eligible_gross,2) ELSE 0 END allocated_discount FROM weights w
  ), net_lines AS (
    SELECT r.*,gross-allocated_discount-CASE WHEN eligible AND last_line=1 THEN
      least(discount,eligible_gross)-sum(allocated_discount) OVER(PARTITION BY sale_id) ELSE 0 END net
    FROM rounded r
  ), costs AS (
    SELECT l.*,pc.unit_cost,coalesce(pc.source,'unknown') cost_source,
      (pc.unit_cost IS NOT NULL AND (pc.source<>'legacy_estimate' OR p_include_estimates)) included
    FROM net_lines l LEFT JOIN motomanager_private.part_sale_costs pc ON pc.sale_item_id=l.id AND pc.organization_id=p_org
    WHERE l.item_type='inventory'
  ), sales_by_part AS (
    SELECT c.inventory_item_id,sum(c.quantity) units,sum(c.net) revenue,count(DISTINCT c.sale_id) sales_count,max(c.created_at) last_sale_at,
      sum(CASE WHEN c.cost_source IN ('inventory_at_sale','purchase_history') THEN c.quantity ELSE 0 END) recorded_units,
      sum(CASE WHEN c.cost_source='legacy_estimate' THEN c.quantity ELSE 0 END) estimated_units,
      sum(CASE WHEN c.unit_cost IS NULL THEN c.quantity ELSE 0 END) missing_units,
      sum(CASE WHEN c.included THEN c.quantity ELSE 0 END) costed_units,
      sum(CASE WHEN c.included THEN c.net ELSE 0 END) costed_revenue,
      sum(CASE WHEN c.included THEN c.unit_cost*c.quantity ELSE 0 END) cost_total
    FROM costs c GROUP BY c.inventory_item_id
  ), stocks AS (
    SELECT st.item_id,sum(st.quantity) stock FROM public.inventory_item_stock st
      JOIN public.inventory_locations loc ON loc.id=st.location_id AND loc.organization_id=p_org
      JOIN public.inventory_items item ON item.id=st.item_id AND item.organization_id=p_org GROUP BY st.item_id
  ), metrics AS MATERIALIZED (
    SELECT i.id item_id,i.name,i.code sku,coalesce(i.category,'Sin categoría') category,i.status,
      coalesce(s.units,0) units,coalesce(s.revenue,0) revenue,coalesce(s.sales_count,0) sales_count,s.last_sale_at,
      coalesce(s.recorded_units,0) recorded_units,coalesce(s.estimated_units,0) estimated_units,coalesce(s.missing_units,0) missing_units,
      coalesce(s.costed_units,0) costed_units,coalesce(s.costed_revenue,0) costed_revenue,
      CASE WHEN s.costed_units>0 THEN round(s.cost_total,2) END cost_total,
      CASE WHEN s.costed_units>0 THEN round(s.costed_revenue-s.cost_total,2) END profit,
      CASE WHEN s.costed_revenue>0 THEN round((s.costed_revenue-s.cost_total)*100/s.costed_revenue,2) END margin,
      coalesce(st.stock,0) stock,coalesce(i.min_quantity,0) minimum_stock,
      round(coalesce(s.units,0)/days_count,2) daily_units,
      CASE WHEN s.units>0 THEN round(greatest(coalesce(st.stock,0),0)*days_count/s.units,1) END coverage_days
    FROM public.inventory_items i LEFT JOIN sales_by_part s ON s.inventory_item_id=i.id LEFT JOIN stocks st ON st.item_id=i.id
    WHERE i.organization_id=p_org
  ), filtered AS (
    SELECT * FROM metrics m WHERE coalesce(trim(p_query),'')='' OR
      strpos(lower(m.name||' '||coalesce(m.sku,'')||' '||m.category),lower(trim(p_query)))>0
  ), ordered AS (
    SELECT f.*,row_number() OVER(ORDER BY
      CASE WHEN p_sort='profit' THEN f.profit END DESC NULLS LAST,
      CASE WHEN p_sort='quantity' THEN f.units END DESC,
      CASE WHEN p_sort='revenue' THEN f.revenue END DESC,
      CASE WHEN p_sort='margin' THEN f.margin END DESC NULLS LAST,
      CASE WHEN p_sort='stock' THEN f.stock END DESC,
      CASE WHEN p_sort='idle' THEN CASE WHEN f.units=0 AND f.stock>0 THEN f.stock ELSE -1 END END DESC,
      f.name,f.item_id) position FROM filtered f
  ), page_rows AS (SELECT * FROM ordered ORDER BY position OFFSET (p_page-1)*p_limit LIMIT p_limit)
  SELECT jsonb_build_object(
    'from',p_from,'to',p_to,'days',days_count,'include_estimates',p_include_estimates,'page',p_page,
    'total_items',(SELECT count(*) FROM filtered),'total_pages',ceil((SELECT count(*) FROM filtered)::numeric/p_limit),
    'summary',(SELECT jsonb_build_object('revenue',coalesce(sum(revenue),0),'units',coalesce(sum(units),0),
      'sales_count',(SELECT count(DISTINCT sale_id) FROM costs),'recorded_units',coalesce(sum(recorded_units),0),
      'estimated_units',coalesce(sum(estimated_units),0),'missing_units',coalesce(sum(missing_units),0),
      'costed_units',coalesce(sum(costed_units),0),'costed_revenue',coalesce(sum(costed_revenue),0),'cost_total',coalesce(sum(cost_total),0),
      'profit',coalesce(sum(profit),0),'margin',CASE WHEN sum(costed_revenue)>0 THEN round(sum(profit)*100/sum(costed_revenue),2) END,
      'idle_items',count(*) FILTER(WHERE units=0 AND stock>0),'sold_items',count(*) FILTER(WHERE units>0)) FROM metrics),
    'rows',coalesce((SELECT jsonb_agg(to_jsonb(r)-'position' ORDER BY r.position) FROM page_rows r),'[]'::jsonb),
    'top_rotating',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.units DESC,r.name) FROM
      (SELECT * FROM metrics WHERE units>0 ORDER BY units DESC,name,item_id LIMIT 6) r),'[]'::jsonb),
    'top_profit',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.profit DESC,r.name) FROM
      (SELECT * FROM metrics WHERE profit>0 ORDER BY profit DESC,name,item_id LIMIT 6) r),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.workshop_parts_profitability(uuid,date,date,text,text,boolean,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workshop_parts_profitability(uuid,date,date,text,text,boolean,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

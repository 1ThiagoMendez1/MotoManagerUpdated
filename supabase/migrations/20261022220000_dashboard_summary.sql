-- One bounded response instead of transferring all sales/orders/inventory to Node.
CREATE OR REPLACE FUNCTION public.workshop_dashboard_summary(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = auth.uid() AND status = 'active'
  ) THEN RAISE EXCEPTION 'Workshop access denied' USING ERRCODE = '42501'; END IF;

  WITH bounds AS (
    SELECT (now() AT TIME ZONE 'America/Bogota')::date AS today,
      date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date AS month_start
  ), recent_sales AS MATERIALIZED (
    SELECT s.total, s.payment_method, (s.created_at AT TIME ZONE 'America/Bogota')::date AS day
    FROM public.sales s, bounds b
    WHERE s.organization_id = p_organization_id AND s.status IN ('paid', 'completed')
      AND s.created_at >= (least(b.month_start, b.today - 6)::timestamp AT TIME ZONE 'America/Bogota')
      AND s.created_at < ((b.today + 1)::timestamp AT TIME ZONE 'America/Bogota')
  ), active_orders AS (
    SELECT count(*) AS orders, count(DISTINCT motorcycle_id) AS motorcycles
    FROM public.work_orders WHERE organization_id = p_organization_id AND status NOT IN ('delivered', 'cancelled')
  ), stock AS (
    SELECT i.id, i.min_quantity, coalesce(sum(s.quantity), 0) AS quantity
    FROM public.inventory_items i LEFT JOIN public.inventory_item_stock s ON s.item_id = i.id
    WHERE i.organization_id = p_organization_id AND i.status = 'active'
      AND i.track_inventory
    GROUP BY i.id, i.min_quantity
  ), days AS (
    SELECT b.today - n AS day FROM bounds b CROSS JOIN generate_series(6, 0, -1) n
  ), revenue AS (
    SELECT d.day, coalesce(sum(s.total), 0) AS total
    FROM days d LEFT JOIN recent_sales s ON s.day = d.day GROUP BY d.day
  ), methods AS (
    SELECT payment_method, sum(total) AS amount FROM recent_sales, bounds
    WHERE day >= month_start GROUP BY payment_method
  ), parts AS (
    SELECT i.id, i.name, sum(si.quantity) AS quantity
    FROM public.sales s JOIN public.sale_items si ON si.sale_id = s.id
    JOIN public.inventory_items i ON i.id = si.inventory_item_id AND i.organization_id = p_organization_id
    WHERE s.organization_id = p_organization_id AND s.status IN ('paid', 'completed')
    GROUP BY i.id, i.name ORDER BY sum(si.quantity) DESC, i.id LIMIT 5
  )
  SELECT jsonb_build_object(
    'ingresosMes', (SELECT coalesce(sum(total), 0) FROM recent_sales, bounds WHERE day >= month_start),
    'activeWorkOrdersCount', (SELECT orders FROM active_orders),
    'motosEnTallerCount', (SELECT motorcycles FROM active_orders),
    'stockCriticoCount', (SELECT count(*) FROM stock WHERE quantity <= coalesce(min_quantity, 5)),
    'revenueData', (SELECT jsonb_agg(jsonb_build_object('date', day, 'ingresos', total, 'gastos', 0) ORDER BY day) FROM revenue),
    'incomeByMethodData', coalesce((SELECT jsonb_agg(jsonb_build_object('method', payment_method, 'amount', amount) ORDER BY amount DESC) FROM methods), '[]'::jsonb),
    'topPartsData', coalesce((SELECT jsonb_agg(jsonb_build_object('name', name, 'ventas', quantity)) FROM parts), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.workshop_dashboard_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workshop_dashboard_summary(uuid) TO authenticated;

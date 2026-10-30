-- psql autocommit required; cannot run CREATE INDEX CONCURRENTLY in a transaction.
\set ON_ERROR_STOP on
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_org_paid_created
  ON public.sales (organization_id, created_at) INCLUDE (total, payment_method)
  WHERE status IN ('paid', 'completed');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_active_motorcycle
  ON public.work_orders (organization_id, motorcycle_id) WHERE status NOT IN ('delivered', 'cancelled');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_user_active
  ON public.organization_members (user_id, joined_at) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_item_quantity
  ON public.inventory_item_stock (item_id) INCLUDE (quantity);
ANALYZE public.sales;
ANALYZE public.work_orders;
ANALYZE public.organization_members;
ANALYZE public.inventory_item_stock;

-- Migración de Endurecimiento y Rendimiento (Fase 6)
-- Agregando índices esenciales para mejorar el rendimiento de consultas frecuentes
-- y búsquedas.

-- Índices en tablas principales (foreign keys) para joins rápidos
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_motorcycles_customer_id ON public.motorcycles(customer_id);
CREATE INDEX IF NOT EXISTS idx_motorcycles_organization_id ON public.motorcycles(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_motorcycle_id ON public.work_orders(motorcycle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);

CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);

CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- Índices para búsquedas de texto (ilike o tsearch) - Opcional pero recomendado para paneles de control
-- Búsqueda por placa (muy común en talleres)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_motorcycles_license_plate_trgm ON public.motorcycles USING gin (license_plate gin_trgm_ops);

-- Endurecimiento de funciones RPC (SECURITY DEFINER)
-- Asegurándonos de que set_search_path está configurado para evitar inyecciones
ALTER FUNCTION public.decrement_inventory(UUID, INT, UUID) SET search_path = public;

-- Habilitar pg_stat_statements (opcional, requiere permisos de superusuario en instancias manejadas, Supabase lo incluye a menudo)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

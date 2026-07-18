-- Migración: Actualizar schema de Wompi para usar Payment Sources
-- (Wompi Colombia NO tiene /customers ni /subscriptions, usa Payment Sources)

-- 1. Agregar la columna wompi_payment_source_id (reemplaza wompi_customer_id y wompi_subscription_id)
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS wompi_payment_source_id BIGINT;

-- 2. (Opcional) Las columnas antiguas se pueden dejar por compatibilidad o eliminar:
-- ALTER TABLE public.workshops DROP COLUMN IF EXISTS wompi_customer_id;
-- ALTER TABLE public.workshops DROP COLUMN IF EXISTS wompi_subscription_id;
-- ALTER TABLE public.workshops DROP COLUMN IF EXISTS wompi_payment_method_token;

-- 3. Index para búsquedas por payment_source_id desde el webhook
CREATE INDEX IF NOT EXISTS idx_workshops_wompi_payment_source_id
ON public.workshops(wompi_payment_source_id)
WHERE wompi_payment_source_id IS NOT NULL;

-- Instrucciones:
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/fmvnbolaowazqyzmkccv/sql/new

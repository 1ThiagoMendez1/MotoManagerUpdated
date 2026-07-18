-- Migración: Agregar campos de contacto y ubicación a la tabla workshops
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS nit TEXT;

-- Verificación (opcional): muestra las columnas de workshops
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'workshops' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Añadir columnas para el estado de la cotización
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMP WITH TIME ZONE;

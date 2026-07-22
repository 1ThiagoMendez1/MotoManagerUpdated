-- Script para agregar el campo de estado de cotización a la tabla work_orders.
-- Ejecuta esto en el SQL Editor de tu panel de Supabase.

ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMP WITH TIME ZONE;

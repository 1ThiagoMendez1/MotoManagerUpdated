ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS quote_status TEXT CHECK (quote_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMPTZ;

-- Refrescar la caché del esquema de Supabase/PostgREST
NOTIFY pgrst, 'reload schema';

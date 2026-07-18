-- 1. Agregar campos a la tabla workshops
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS wompi_customer_id TEXT,
ADD COLUMN IF NOT EXISTS wompi_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS wompi_payment_method_token TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_payment_attempts INT DEFAULT 0;

-- 2. Crear tabla de historial de transacciones (pagos)
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
    wompi_transaction_id TEXT UNIQUE,
    amount NUMERIC,
    status TEXT, -- PENDING, APPROVED, DECLINED, ERROR
    payment_method_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para la nueva tabla
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir select solo a los dueños/admin del workshop correspondiente
CREATE POLICY "View own workshop subscription transactions" ON public.subscription_transactions
FOR SELECT
USING (
  workshop_id IN (
    SELECT workshop_id FROM public.workshop_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

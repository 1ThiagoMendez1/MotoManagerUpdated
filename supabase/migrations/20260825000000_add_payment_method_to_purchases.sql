ALTER TABLE public.purchases
ADD COLUMN payment_method TEXT,
ADD COLUMN credit_days INTEGER DEFAULT 0;

ALTER TABLE public.expenses
ADD COLUMN payment_method TEXT;

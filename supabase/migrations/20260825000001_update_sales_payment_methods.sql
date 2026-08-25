-- Update payment method check constraint to support Nequi, DaviPlata, and Wompi explicitly

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'transfer', 'other', 'nequi', 'daviplata', 'wompi'));

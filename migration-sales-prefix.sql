-- Change sale_number from INTEGER/SERIAL to TEXT to support prefixes like 'V' and 'VS'
ALTER TABLE public.sales ALTER COLUMN sale_number TYPE text;

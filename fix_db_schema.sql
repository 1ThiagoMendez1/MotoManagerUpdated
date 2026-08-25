ALTER TABLE public.inventory_items ADD COLUMN physical_location TEXT;
ALTER TABLE public.inventory_items ADD COLUMN supplier_name TEXT;

-- Migrate existing data (Optional, but let's try to parse it roughly)
UPDATE public.inventory_items
SET supplier_name = REPLACE(description, 'Proveedor: ', '')
WHERE description LIKE 'Proveedor: %';

-- Clear description since we migrated it
UPDATE public.inventory_items
SET description = NULL;

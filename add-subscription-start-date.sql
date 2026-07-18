-- Add subscription_start_date to workshops table
ALTER TABLE public.workshops 
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing records to have start_date = created_at if null
UPDATE public.workshops 
SET subscription_start_date = created_at 
WHERE subscription_start_date IS NULL;

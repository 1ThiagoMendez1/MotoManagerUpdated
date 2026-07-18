-- 1. Create the new enum type
CREATE TYPE subscription_plan_new AS ENUM ('monthly', 'biannual', 'yearly');

-- 2. Migrate the table to use the new type
-- We map existing legacy values to the new ones to ensure no data loss.
-- 'free' -> 'monthly' (Default)
-- 'pro' -> 'biannual'
-- 'enterprise' -> 'yearly'

ALTER TABLE public.workshops 
ALTER COLUMN subscription_plan DROP DEFAULT;

ALTER TABLE public.workshops 
ALTER COLUMN subscription_plan 
TYPE subscription_plan_new 
USING (
  CASE subscription_plan::text
    WHEN 'free' THEN 'monthly'::subscription_plan_new
    WHEN 'pro' THEN 'biannual'::subscription_plan_new
    WHEN 'enterprise' THEN 'yearly'::subscription_plan_new
    ELSE 'monthly'::subscription_plan_new
  END
);

-- 3. Set the new default
ALTER TABLE public.workshops 
ALTER COLUMN subscription_plan SET DEFAULT 'monthly';

-- 4. Clean up the old type and rename the new one
DROP TYPE subscription_plan;
ALTER TYPE subscription_plan_new RENAME TO subscription_plan;

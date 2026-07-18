-- ==============================================================================
-- 1. ADD MISSING COLUMNS TO user_profiles
-- ==============================================================================
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS has_seen_welcome boolean default false,
ADD COLUMN IF NOT EXISTS is_super_admin boolean default false;

-- ==============================================================================
-- 2. CREATE wompi_payments TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wompi_payments (
    id uuid primary key default uuid_generate_v4(),
    transaction_id text unique not null,
    reference text,
    status text,
    amount_in_cents bigint,
    currency text,
    payment_method text,
    customer_email text,
    raw_payload jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for wompi_payments
ALTER TABLE public.wompi_payments ENABLE ROW LEVEL SECURITY;

-- Wompi Webhook Policy (usually inserted from backend without RLS checks by using service_role,
-- but if querying from the frontend, we add a policy).
CREATE POLICY "Super Admins can view wompi_payments" ON public.wompi_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_super_admin = TRUE
        )
    );

-- ==============================================================================
-- 3. UPDATE handle_new_user TRIGGER
-- ==============================================================================
-- Ensure new users also insert their phone number correctly when created via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, avatar_url, phone)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    phone = excluded.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. SUBSCRIPTION PLAN ENUM FIX
-- ==============================================================================
-- The frontend has been updated to use 'monthly', 'biannual', 'yearly' exclusively.
-- If your current database enum for subscription_plan still has 'free', 'pro', 'enterprise',
-- you can uncomment the following lines to add the new ones to your enum:
-- ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'monthly';
-- ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'biannual';
-- ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'yearly';

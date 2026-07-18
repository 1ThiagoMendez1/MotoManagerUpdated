-- Add has_seen_welcome to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome boolean DEFAULT false;

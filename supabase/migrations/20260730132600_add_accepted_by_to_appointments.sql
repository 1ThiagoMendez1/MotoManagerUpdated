-- Add accepted_by column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

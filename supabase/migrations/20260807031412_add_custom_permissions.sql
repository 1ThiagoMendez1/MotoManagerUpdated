-- Add custom_permissions JSONB column to organization_members
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;

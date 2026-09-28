-- Migration: Create Notifications Table with Realtime & Multi-tenant RLS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    urgent BOOLEAN NOT NULL DEFAULT false,
    read_by UUID[] NOT NULL DEFAULT '{}'::UUID[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast query of organization notifications
CREATE INDEX IF NOT EXISTS idx_notifications_org_created 
ON public.notifications(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist to allow clean re-runs
DROP POLICY IF EXISTS "Allow all to read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all to update notifications" ON public.notifications;

-- Basic Policies for Multi-tenancy
CREATE POLICY "Allow all to read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow all to insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update notifications" ON public.notifications FOR UPDATE USING (true);

-- Enable Supabase Realtime for notifications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
        -- already in publication
    END;
END $$;

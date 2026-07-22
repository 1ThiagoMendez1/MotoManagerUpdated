-- 1. Create Evidence Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'evidences' bucket
-- Note: We assume files are uploaded to a path starting with the organization_id: 'org_id/file.ext'

-- Allow view (publicly readable since bucket is public, but just in case)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'evidences');

-- Allow upload for organization members
CREATE POLICY "Organization Members can upload evidence" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);

-- Allow update for organization members
CREATE POLICY "Organization Members can update evidence" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);

-- Allow delete for organization members
CREATE POLICY "Organization Members can delete evidence" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);


-- 3. Enable Real-time for work_orders
-- Ensure realtime publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
END $$;

-- Add work_orders to realtime publication if it isn't already (Supabase manages this but we can explicitly do it)
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;

-- 4. Create Work Order Evidences Table
CREATE TABLE public.work_order_evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.work_order_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work order evidences of their organization" ON public.work_order_evidences
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage work order evidences of their organization" ON public.work_order_evidences
    FOR ALL USING (public.is_organization_member(organization_id));

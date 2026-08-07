-- Create part_requests table
CREATE TABLE public.part_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
    fulfilled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_part_requests
BEFORE UPDATE ON public.part_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view part requests of their organization" ON public.part_requests
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage part requests of their organization" ON public.part_requests
    FOR ALL USING (public.is_organization_member(organization_id));

-- Realtime publication
alter publication supabase_realtime add table public.part_requests;

CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    motorcycle_id UUID NOT NULL REFERENCES public.motorcycles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_reminders
BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders in their organization" ON public.reminders
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can insert reminders in their organization" ON public.reminders
    FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY "Users can update reminders in their organization" ON public.reminders
    FOR UPDATE USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can delete reminders in their organization" ON public.reminders
    FOR DELETE USING (public.is_organization_member(organization_id));

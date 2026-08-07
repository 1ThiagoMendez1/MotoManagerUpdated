-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_expenses
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses of their organization" ON public.expenses
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.expenses.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'Recepcionista')
            AND status = 'active'
        )
    );

CREATE POLICY "Users with permission can update expenses" ON public.expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.expenses.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'Recepcionista')
            AND status = 'active'
        )
    );

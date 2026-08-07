-- Create daily_closings table
CREATE TABLE IF NOT EXISTS public.daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('closed', 'no_sales')),
    details JSONB DEFAULT '{}'::jsonb, -- Store snapshot of the day (categories, techs, expenses, etc.)
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, date) -- Only one closing per organization per day
);

-- RLS
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily_closings of their organization" ON public.daily_closings
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can insert daily_closings" ON public.daily_closings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.daily_closings.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'Recepcionista')
            AND status = 'active'
        )
    );

-- 1. Add category to service_catalog
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Create payroll_payments table
CREATE TABLE IF NOT EXISTS public.payroll_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_services_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_payroll_payments
BEFORE UPDATE ON public.payroll_payments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll_payments of their organization" ON public.payroll_payments
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can insert payroll_payments" ON public.payroll_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.payroll_payments.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "Users with permission can update payroll_payments" ON public.payroll_payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.payroll_payments.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- 1. Customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_type TEXT,
    document_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, document_number)
);

CREATE TRIGGER handle_updated_at_customers
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers of their organization" ON public.customers
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can insert customers" ON public.customers
    FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can update customers" ON public.customers
    FOR UPDATE USING (public.is_organization_member(organization_id));

-- 2. Motorcycles
CREATE TABLE public.motorcycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    license_plate TEXT,
    vin TEXT,
    brand TEXT,
    model TEXT,
    model_year INTEGER,
    engine_displacement_cc INTEGER,
    color TEXT,
    current_mileage INTEGER,
    engine_number TEXT,
    chassis_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, license_plate),
    UNIQUE (organization_id, vin)
);

CREATE TRIGGER handle_updated_at_motorcycles
BEFORE UPDATE ON public.motorcycles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.motorcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view motorcycles of their organization" ON public.motorcycles
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can insert motorcycles" ON public.motorcycles
    FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY "Users with permission can update motorcycles" ON public.motorcycles
    FOR UPDATE USING (public.is_organization_member(organization_id));

-- 3. Appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE CASCADE,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (scheduled_end > scheduled_start)
);

CREATE TRIGGER handle_updated_at_appointments
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appointments of their organization" ON public.appointments
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage appointments of their organization" ON public.appointments
    FOR ALL USING (public.is_organization_member(organization_id));

-- 4. Work Orders
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    order_number SERIAL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    assigned_mechanic_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'received', 'diagnosis', 'waiting_approval', 'approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'delivered', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    reported_symptoms TEXT,
    technical_diagnosis TEXT,
    customer_observations TEXT,
    mileage_in INTEGER,
    fuel_level TEXT,
    estimated_completion_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_total NUMERIC(12, 2) DEFAULT 0,
    discount_total NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, order_number)
);

CREATE TRIGGER handle_updated_at_work_orders
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work orders of their organization" ON public.work_orders
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage work orders of their organization" ON public.work_orders
    FOR ALL USING (public.is_organization_member(organization_id));

-- 5. Work Order Status History
CREATE TABLE public.work_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.work_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work order history of their org" ON public.work_order_status_history
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can insert work order history" ON public.work_order_status_history
    FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

-- 6. Service Catalog
CREATE TABLE public.service_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    default_duration_minutes INTEGER,
    default_price NUMERIC(12, 2) DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE (organization_id, code)
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view service catalog" ON public.service_catalog
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage service catalog" ON public.service_catalog
    FOR ALL USING (public.is_organization_member(organization_id));

-- 7. Work Order Services
CREATE TABLE public.work_order_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_work_order_services
BEFORE UPDATE ON public.work_order_services
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.work_order_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view work order services" ON public.work_order_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.work_orders 
            WHERE work_orders.id = work_order_services.work_order_id 
            AND public.is_organization_member(work_orders.organization_id)
        )
    );

CREATE POLICY "Users can manage work order services" ON public.work_order_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.work_orders 
            WHERE work_orders.id = work_order_services.work_order_id 
            AND public.is_organization_member(work_orders.organization_id)
        )
    );

-- RPC for Transactional Work Order Creation
CREATE OR REPLACE FUNCTION public.create_work_order(
    p_organization_id UUID,
    p_customer_id UUID,
    p_motorcycle_id UUID,
    p_reported_symptoms TEXT
) RETURNS UUID AS $$
DECLARE
    new_work_order_id UUID;
BEGIN
    IF NOT public.is_organization_member(p_organization_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    INSERT INTO public.work_orders (organization_id, customer_id, motorcycle_id, reported_symptoms, status, created_by)
    VALUES (p_organization_id, p_customer_id, p_motorcycle_id, p_reported_symptoms, 'received', auth.uid())
    RETURNING id INTO new_work_order_id;

    INSERT INTO public.work_order_status_history (work_order_id, organization_id, previous_status, new_status, changed_by)
    VALUES (new_work_order_id, p_organization_id, 'draft', 'received', auth.uid());

    RETURN new_work_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

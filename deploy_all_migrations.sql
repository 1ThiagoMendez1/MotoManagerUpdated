-- =========================================================================
-- DEPLOY COMPLETO DE MOTOMANAGER - SUPABASE
-- Copia todo este código y pégalo en el SQL Editor de tu Dashboard de Supabase.
-- Luego haz clic en "Run" (Ejecutar).
-- =========================================================================

-- =========================================================================
-- MIGRACIÓN 1: FUNDACIÓN Y AUTH
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    legal_name TEXT,
    tax_identifier TEXT,
    phone TEXT,
    email TEXT,
    country_code TEXT DEFAULT 'CO',
    timezone TEXT DEFAULT 'America/Bogota',
    currency_code TEXT DEFAULT 'COP',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Profiles (vinculados a auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_path TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger automático para crear profile al registrar user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Organization Members
CREATE TABLE public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'service_advisor', 'mechanic', 'inventory_manager', 'cashier', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TRIGGER handle_updated_at_organization_members
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Organizations
CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT USING (public.is_organization_member(id));

CREATE POLICY "Owners can update their organization" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.organizations.id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- Policies for Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their organizations" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members m1
            JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
            WHERE m1.user_id = auth.uid() 
            AND m2.user_id = public.profiles.id
        )
    );

-- Policies for Organization Members
CREATE POLICY "Users can view members of their organizations" ON public.organization_members
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Admins can manage organization members" ON public.organization_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = public.organization_members.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- Función para crear una nueva organización y asignar al creador como Owner
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    org_name TEXT,
    org_slug TEXT,
    org_email TEXT DEFAULT NULL,
    org_phone TEXT DEFAULT NULL,
    org_legal_name TEXT DEFAULT NULL,
    org_tax_identifier TEXT DEFAULT NULL,
    sub_plan TEXT DEFAULT 'monthly',
    demo_start TEXT DEFAULT NULL,
    demo_end TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Validar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insertar organización
    INSERT INTO public.organizations (name, slug, email, phone, legal_name, tax_identifier, settings)
    VALUES (
        org_name, 
        org_slug,
        org_email,
        org_phone,
        org_legal_name,
        org_tax_identifier,
        (
            CASE 
                WHEN sub_plan = 'demo' AND demo_start IS NOT NULL AND demo_end IS NOT NULL THEN
                    jsonb_build_object('plan', sub_plan, 'demoStartDate', demo_start, 'demoEndDate', demo_end)
                ELSE
                    jsonb_build_object('plan', sub_plan)
            END
        )
    )
    RETURNING id INTO new_org_id;

    -- Añadir como owner
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, auth.uid(), 'owner', 'active');

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- MIGRACIÓN 2: NEGOCIO PRINCIPAL (Clientes, Motos, Órdenes de Trabajo)
-- =========================================================================

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


-- =========================================================================
-- MIGRACIÓN 3: INVENTARIO Y FACTURACIÓN
-- =========================================================================

-- 1. Inventory Items
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_quantity NUMERIC(10, 2) DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, code)
);

CREATE TRIGGER handle_updated_at_inventory_items
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory of their organization" ON public.inventory_items
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage inventory of their organization" ON public.inventory_items
    FOR ALL USING (public.is_organization_member(organization_id));


-- 2. Sales / Invoices
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    sale_number TEXT,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_total NUMERIC(12, 2) DEFAULT 0,
    discount_total NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'transfer', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, sale_number)
);

CREATE TRIGGER handle_updated_at_sales
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales of their organization" ON public.sales
    FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY "Users can manage sales of their organization" ON public.sales
    FOR ALL USING (public.is_organization_member(organization_id));


-- 3. Sale Items
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('inventory', 'service')),
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale items of their organization" ON public.sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales 
            WHERE sales.id = sale_items.sale_id 
            AND public.is_organization_member(sales.organization_id)
        )
    );

CREATE POLICY "Users can manage sale items of their organization" ON public.sale_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sales 
            WHERE sales.id = sale_items.sale_id 
            AND public.is_organization_member(sales.organization_id)
        )
    );

-- 4. Inventory decrement RPC
CREATE OR REPLACE FUNCTION public.decrement_inventory(item_id UUID, amount NUMERIC) 
RETURNS void AS $$
BEGIN
    UPDATE public.inventory_items
    SET quantity = quantity - amount
    WHERE id = item_id AND quantity >= amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock or item not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- MIGRACIÓN 4: STORAGE Y REAL-TIME
-- =========================================================================

-- 1. Create Evidence Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'evidences' bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'evidences');

CREATE POLICY "Organization Members can upload evidence" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Organization Members can update evidence" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Organization Members can delete evidence" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'evidences' AND
    public.is_organization_member((storage.foldername(name))[1]::uuid)
);

-- 3. Enable Real-time for work_orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;
END $$;

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


-- =========================================================================
-- MIGRACIÓN 5: ENDURECIMIENTO Y PERFORMANCE
-- =========================================================================

-- Índices en tablas principales (foreign keys) para joins rápidos
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_motorcycles_customer_id ON public.motorcycles(customer_id);
CREATE INDEX IF NOT EXISTS idx_motorcycles_organization_id ON public.motorcycles(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_motorcycle_id ON public.work_orders(motorcycle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_start ON public.appointments(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);

CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- Índices para búsquedas de texto (ilike o tsearch)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_motorcycles_license_plate_trgm ON public.motorcycles USING gin (license_plate gin_trgm_ops);

-- Endurecimiento de funciones RPC (SECURITY DEFINER)
-- (CORREGIDO DE UUID, INT, UUID -> UUID, NUMERIC)
ALTER FUNCTION public.decrement_inventory(UUID, NUMERIC) SET search_path = public;

-- Habilitar pg_stat_statements (opcional)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
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
-- 1. Suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER handle_updated_at_suppliers BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view suppliers of their organization" ON public.suppliers FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY "Users can manage suppliers of their organization" ON public.suppliers FOR ALL USING (public.is_organization_member(organization_id));

-- 2. Inventory Locations
CREATE TABLE public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('warehouse', 'storefront')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER handle_updated_at_inventory_locations BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view inventory_locations of their organization" ON public.inventory_locations FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY "Users can manage inventory_locations of their organization" ON public.inventory_locations FOR ALL USING (public.is_organization_member(organization_id));

-- 3. Modify inventory_items
ALTER TABLE public.inventory_items ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_items ADD COLUMN track_inventory BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.inventory_items ADD COLUMN last_cost NUMERIC(12, 2) DEFAULT 0;

-- 4. Inventory Item Stock
CREATE TABLE public.inventory_item_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(item_id, location_id)
);
CREATE TRIGGER handle_updated_at_inventory_item_stock BEFORE UPDATE ON public.inventory_item_stock FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.inventory_item_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view inventory_item_stock of their organization" ON public.inventory_item_stock FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_item_stock.item_id AND public.is_organization_member(i.organization_id))
);
CREATE POLICY "Users can manage inventory_item_stock of their organization" ON public.inventory_item_stock FOR ALL USING (
    EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = inventory_item_stock.item_id AND public.is_organization_member(i.organization_id))
);

-- 5. Inventory Movements
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'transfer', 'sale', 'adjustment')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view inventory_movements of their organization" ON public.inventory_movements FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY "Users can insert inventory_movements of their organization" ON public.inventory_movements FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

-- 6. Purchases
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_number TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_total NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER handle_updated_at_purchases BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view purchases of their organization" ON public.purchases FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY "Users can manage purchases of their organization" ON public.purchases FOR ALL USING (public.is_organization_member(organization_id));

-- 7. Purchase Items
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view purchase_items of their organization" ON public.purchase_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_items.purchase_id AND public.is_organization_member(p.organization_id))
);
CREATE POLICY "Users can manage purchase_items of their organization" ON public.purchase_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_items.purchase_id AND public.is_organization_member(p.organization_id))
);

-- 8. Migration Script: Create locations for existing orgs and move stock
DO $$
DECLARE
    org_record RECORD;
    bodega_id UUID;
    vitrina_id UUID;
    item_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations LOOP
        -- Create Bodega
        INSERT INTO public.inventory_locations (organization_id, name, type) 
        VALUES (org_record.id, 'Bodega Principal', 'warehouse') RETURNING id INTO bodega_id;
        
        -- Create Vitrina
        INSERT INTO public.inventory_locations (organization_id, name, type) 
        VALUES (org_record.id, 'Vitrina', 'storefront') RETURNING id INTO vitrina_id;

        -- Migrate items
        FOR item_record IN SELECT id, quantity FROM public.inventory_items WHERE organization_id = org_record.id LOOP
            INSERT INTO public.inventory_item_stock (item_id, location_id, quantity)
            VALUES (item_record.id, vitrina_id, item_record.quantity);
        END LOOP;
    END LOOP;
END $$;

-- 9. Remove old quantity column from inventory_items
ALTER TABLE public.inventory_items DROP COLUMN quantity;

-- 10. Update decrement_inventory to handle locations
CREATE OR REPLACE FUNCTION public.decrement_inventory(p_item_id UUID, p_amount NUMERIC, p_location_id UUID DEFAULT NULL, p_sale_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL) 
RETURNS void AS $$
DECLARE
    v_track_inventory BOOLEAN;
    v_org_id UUID;
    v_loc_id UUID;
BEGIN
    SELECT track_inventory, organization_id INTO v_track_inventory, v_org_id 
    FROM public.inventory_items WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found';
    END IF;

    IF NOT v_track_inventory THEN
        RETURN;
    END IF;

    v_loc_id := p_location_id;
    IF v_loc_id IS NULL THEN
        SELECT id INTO v_loc_id FROM public.inventory_locations WHERE organization_id = v_org_id AND type = 'storefront' LIMIT 1;
    END IF;
    
    IF v_loc_id IS NULL THEN
        RAISE EXCEPTION 'No location specified and no storefront location found for organization';
    END IF;

    UPDATE public.inventory_item_stock
    SET quantity = quantity - p_amount
    WHERE item_id = p_item_id AND location_id = v_loc_id AND quantity >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock in the specified location';
    END IF;

    INSERT INTO public.inventory_movements (organization_id, item_id, from_location_id, to_location_id, quantity, movement_type, reference_id, created_by)
    VALUES (v_org_id, p_item_id, v_loc_id, NULL, p_amount, 'sale', p_sale_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. New RPC for processing purchases
CREATE OR REPLACE FUNCTION public.process_purchase_receipt(p_purchase_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_purchase RECORD;
    v_item RECORD;
    v_loc_id UUID;
    v_expense_id UUID;
BEGIN
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;
    
    IF v_purchase.status = 'received' THEN
        RAISE EXCEPTION 'Purchase is already received';
    END IF;

    SELECT id INTO v_loc_id FROM public.inventory_locations WHERE organization_id = v_purchase.organization_id AND type = 'warehouse' LIMIT 1;
    IF v_loc_id IS NULL THEN
        SELECT id INTO v_loc_id FROM public.inventory_locations WHERE organization_id = v_purchase.organization_id LIMIT 1;
    END IF;

    INSERT INTO public.expenses (organization_id, category, description, amount, created_by)
    VALUES (
        v_purchase.organization_id, 
        'Compra de Inventario', 
        'Factura de compra ' || COALESCE(v_purchase.invoice_number, '(Sin Nro)'), 
        v_purchase.total, 
        p_user_id
    ) RETURNING id INTO v_expense_id;

    UPDATE public.purchases 
    SET status = 'received', expense_id = v_expense_id 
    WHERE id = p_purchase_id;

    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id LOOP
        UPDATE public.inventory_items SET last_cost = v_item.unit_cost WHERE id = v_item.item_id;
        
        INSERT INTO public.inventory_item_stock (item_id, location_id, quantity)
        VALUES (v_item.item_id, v_loc_id, v_item.quantity)
        ON CONFLICT (item_id, location_id) 
        DO UPDATE SET quantity = public.inventory_item_stock.quantity + EXCLUDED.quantity;

        INSERT INTO public.inventory_movements (organization_id, item_id, from_location_id, to_location_id, quantity, movement_type, reference_id, created_by)
        VALUES (v_purchase.organization_id, v_item.item_id, NULL, v_loc_id, v_item.quantity, 'purchase', p_purchase_id, p_user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Update payment method check constraint to support Nequi, DaviPlata, and Wompi explicitly

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'transfer', 'other', 'nequi', 'daviplata', 'wompi'));

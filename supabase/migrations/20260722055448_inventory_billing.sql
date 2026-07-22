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

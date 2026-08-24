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

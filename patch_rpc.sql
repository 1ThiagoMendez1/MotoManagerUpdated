CREATE OR REPLACE FUNCTION public.process_purchase_receipt(p_purchase_id UUID, p_user_id UUID, p_location_id UUID DEFAULT NULL)
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

    IF p_location_id IS NOT NULL THEN
        v_loc_id := p_location_id;
    ELSE
        SELECT id INTO v_loc_id FROM public.inventory_locations WHERE organization_id = v_purchase.organization_id AND type = 'warehouse' LIMIT 1;
        IF v_loc_id IS NULL THEN
            SELECT id INTO v_loc_id FROM public.inventory_locations WHERE organization_id = v_purchase.organization_id LIMIT 1;
        END IF;
    END IF;

    INSERT INTO public.expenses (organization_id, category, description, amount, created_by)
    VALUES (
        v_purchase.organization_id, 
        'Compra de Inventario', 
        'Factura de compra ' || COALESCE(v_purchase.invoice_number, '(Sin Nro)'), 
        v_purchase.total, 
        p_user_id
    ) RETURNING id INTO v_expense_id;

    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id LOOP
        INSERT INTO public.inventory_item_stock (item_id, location_id, quantity)
        VALUES (v_item.item_id, v_loc_id, v_item.quantity)
        ON CONFLICT (item_id, location_id)
        DO UPDATE SET quantity = public.inventory_item_stock.quantity + EXCLUDED.quantity;
        
        INSERT INTO public.inventory_movements (organization_id, item_id, from_location_id, to_location_id, quantity, movement_type, reference_id, created_by)
        VALUES (v_purchase.organization_id, v_item.item_id, NULL, v_loc_id, v_item.quantity, 'purchase', p_purchase_id, p_user_id);
    END LOOP;

    UPDATE public.purchases SET status = 'received' WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql;

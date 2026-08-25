const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the block where we update inventory_items
const oldBlock = `    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            code: data.sku,
            category: data.category,
            description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al actualizar.' };
    }
    
    // Si están asignando una cantidad inicial (porque antes no controlaba stock)
    if (data.quantity && data.quantity > 0 && trackInventory) {
        // Verificar si ya tiene stock en vitrina
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .maybeSingle();
            
        if (vitrinaLoc) {
            const { data: existingStock } = await supabase
                .from('inventory_item_stock')
                .select('id')
                .eq('item_id', id)
                .maybeSingle();
                
            if (!existingStock) {
                // Insertar el stock inicial en Vitrina por defecto
                await supabase.from('inventory_item_stock').insert({
                    item_id: id,
                    location_id: vitrinaLoc.id,
                    quantity: data.quantity
                });
                
                // Registrar el movimiento de ajuste inicial
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: id,
                    from_location_id: null,
                    to_location_id: vitrinaLoc.id,
                    quantity: data.quantity,
                    movement_type: 'adjustment',
                    created_by: user.userId,
                    notes: 'Stock inicial al activar control de inventario'
                });
            }
        }
    }`;

const newBlock = `    // Fetch old item to check if track_inventory was false
    const { data: oldItem } = await supabase
        .from('inventory_items')
        .select('track_inventory')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            code: data.sku,
            category: data.category,
            description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al actualizar.' };
    }
    
    // Si antes NO controlaba stock y ahora SÍ controla, y mandaron una cantidad
    if (oldItem && oldItem.track_inventory === false && data.trackInventory) {
        const qtyRaw = formData.get('quantity');
        const qtyNum = qtyRaw ? Number(qtyRaw) : 0;
        
        if (qtyNum >= 0) {
            // Verificar si ya tiene stock en vitrina
            const { data: vitrinaLoc } = await supabase
                .from('inventory_locations')
                .select('id')
                .eq('organization_id', user.workshopId)
                .eq('type', 'storefront')
                .maybeSingle();
                
            if (vitrinaLoc) {
                // Borrar cualquier stock basura anterior para este item
                await supabase.from('inventory_item_stock').delete().eq('item_id', id);
                
                // Insertar el stock nuevo
                await supabase.from('inventory_item_stock').insert({
                    item_id: id,
                    location_id: vitrinaLoc.id,
                    quantity: qtyNum
                });
                
                if (qtyNum > 0) {
                    // Registrar el movimiento de ajuste inicial
                    await supabase.from('inventory_movements').insert({
                        organization_id: user.workshopId,
                        item_id: id,
                        from_location_id: null,
                        to_location_id: vitrinaLoc.id,
                        quantity: qtyNum,
                        movement_type: 'adjustment',
                        created_by: user.userId,
                        notes: 'Stock inicial al activar control de inventario'
                    });
                }
            }
        }
    }`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed stock initial logic');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the line with .eq('organization_id', user.workshopId);
const searchBlock = `        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al actualizar.' };
    }

    revalidatePath('/inventory');`;

const insertBlock = `        .eq('id', id)
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
    }

    revalidatePath('/inventory');`;

content = content.replace(searchBlock, insertBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed update action to handle initial stock');

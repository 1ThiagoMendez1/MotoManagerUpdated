const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldStockLogic = `        // Put initial stock in vitrina (storefront)
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .maybeSingle();

        if (vitrinaLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: vitrinaLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: vitrinaLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase',
                    created_by: user.userId
                });
            }
        }`;

const newStockLogic = `        // Put initial stock in requested destination
        const destType = data.destination === 'warehouse' ? 'warehouse' : 'storefront';
        const { data: destLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', destType)
            .maybeSingle();

        if (destLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: destLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: destLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase',
                    created_by: user.userId
                });
            }
        }`;

content = content.replace(oldStockLogic, newStockLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed stock logic');

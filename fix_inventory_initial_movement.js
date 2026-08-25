const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldStockInsert = `
        if (vitrinaLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: vitrinaLoc.id,
                quantity: data.quantity || 0
            });
        }`;

const newStockInsert = `
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

content = content.replace(oldStockInsert, newStockInsert);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed initial movement tracking');

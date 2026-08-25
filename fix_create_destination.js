const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `    if (!error && insertedItem && data.trackInventory !== false) {
        // Insert initial stock in Vitrina
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .limit(1)
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
        }
    }`;

const newBlock = `    if (!error && insertedItem && data.trackInventory !== false) {
        // Find the requested location (Vitrina or Bodega)
        const locationType = data.destination || 'storefront';
        const { data: targetLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', locationType)
            .limit(1)
            .maybeSingle();

        if (targetLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: targetLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: targetLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase', // initial stock treated as purchase
                    created_by: user.userId,
                    notes: \`Stock inicial en \${locationType === 'warehouse' ? 'Bodega' : 'Vitrina'}\`
                });
            }
        }
    }`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed create destination in Server Action!');

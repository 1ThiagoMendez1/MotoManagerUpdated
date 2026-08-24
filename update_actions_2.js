const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update updateInventoryItem
const updateOld = `    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            code: data.sku,
            category: data.category,
            description: \`Ubicación: \${data.location} | Proveedor: \${data.supplier} | Costo: \${data.supplierPrice}\`,
            quantity: data.quantity,
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);`;

const updateNew = `    const { error } = await supabase
        .from('inventory_items')
        .update({
            name: data.name,
            code: data.sku,
            category: data.category,
            description: \`Proveedor: \${data.supplier || ''}\`,
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);`;

content = content.replace(updateOld, updateNew);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated updateInventoryItem');

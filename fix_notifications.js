const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/notifications.ts');
let content = fs.readFileSync(filePath, 'utf8');

const badQuery = `      const { data: inventory, error: invError } = await supabase
        .from('inventory_items')
        .select('id, quantity, min_quantity')
        .eq('organization_id', user.workshopId);`;

const goodQuery = `      const { data: inventory, error: invError } = await supabase
        .from('inventory_items')
        .select('id, min_quantity, inventory_item_stock(quantity), track_inventory')
        .eq('organization_id', user.workshopId);`;

content = content.replace(badQuery, goodQuery);

const badCount = `      const stockCriticoCount = (inventory || []).filter(item => item.quantity <= (item.min_quantity || 5)).length;`;

const goodCount = `      const stockCriticoCount = (inventory || []).filter(item => {
        if (item.track_inventory === false) return false;
        const totalQty = item.inventory_item_stock?.reduce((acc, stock) => acc + (stock.quantity || 0), 0) || 0;
        return totalQty <= (item.min_quantity || 5);
      }).length;`;

content = content.replace(badCount, goodCount);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed notifications');

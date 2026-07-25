const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const supabaseUrl = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].trim();
const supabaseKey = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY')).split('=')[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: items } = await supabase.from('inventory_items').select('id, name, unit_price, organization_id').limit(2);
    
    if (!items || items.length === 0) {
        console.log("No items found");
        return;
    }
    
    const orgId = items[0].organization_id;
    
    // Get WO-1 and WO-4
    const { data: wos } = await supabase.from('work_orders').select('id, order_number').in('order_number', [1, 4]);
    
    for (const wo of wos) {
        const { data: sale } = await supabase.from('sales').insert({
            organization_id: orgId,
            work_order_id: wo.id,
            status: 'pending',
            total: items[0].unit_price
        }).select().single();
        
        await supabase.from('sale_items').insert({
            sale_id: sale.id,
            item_type: 'inventory',
            inventory_item_id: items[0].id,
            description: items[0].name,
            quantity: 1,
            unit_price: items[0].unit_price,
            total: items[0].unit_price
        });
        
        console.log(`Added items for WO-${wo.order_number}`);
    }
}
run();

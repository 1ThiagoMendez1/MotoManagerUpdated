require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, track_inventory, inventory_item_stock(quantity)')
    .eq('name', 'TORNILLOS DE LUJO NARANJA')
    .single();

  console.log(JSON.stringify(data, null, 2));
}
run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: members } = await supabase.from('workshop_members').select('user_id, workshop_id, role');
  console.log('Members:', members);

  const { data: inventory } = await supabase.from('inventory_items').select('id, workshop_id, name');
  console.log('Inventory:', inventory);

  const { data: techs } = await supabase.from('tecnicos_activos').select('id, workshop_id, name');
  console.log('Techs:', techs);
}

run();

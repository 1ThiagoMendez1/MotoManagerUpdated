const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('--- checking data ---');
  
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log(`Users: ${users.users.length}`);
  
  const { data: profiles } = await supabase.from('user_profiles').select('*');
  console.log(`Profiles: ${profiles.length}`);
  
  const { data: members } = await supabase.from('workshop_members').select('*');
  console.log(`Members:`, members);
  
  const { data: inventory } = await supabase.from('inventory_items').select('*');
  console.log(`Inventory Items: ${inventory.length}`);
  
  const { data: techs } = await supabase.from('tecnicos_activos').select('*');
  console.log(`Technicians: ${techs.length}`);
}

check();

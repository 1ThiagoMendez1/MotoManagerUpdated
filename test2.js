const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k) acc[k.trim()] = (v || '').trim();
  return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*)), customers(*), profiles!work_orders_assigned_mechanic_id_fkey(*)').limit(1);
  console.log('Error profiles:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
test();

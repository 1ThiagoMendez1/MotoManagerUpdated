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
  const { data, error } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*)), customers(*), profiles(*)').limit(1);
  console.log('Error profiles:', error);
  const { data: d2, error: e2 } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*)), customers(*)').limit(1);
  console.log('Error without profiles:', e2);
  const { data: d3, error: e3 } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*)), profiles(*)').limit(1);
  console.log('Error with profiles but no customers:', e3);
  const { data: d4, error: e4 } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*))').limit(1);
  console.log('Error only motorcycles:', e4);
}
test();

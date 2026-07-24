import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase.from('work_orders').select('*, motorcycles(*, customers(*)), profiles(*)').limit(1);
  console.log('Error 1:', error);
  
  const { data: d2, error: e2 } = await supabase.from('work_orders').select('*, motorcycles(*), customers(*), profiles(*)').limit(1);
  console.log('Error 2:', e2);

  const { data: d3, error: e3 } = await supabase.from('work_orders').select('*, motorcycles(*), customers(*)').limit(1);
  console.log('Error 3:', e3);
}
main();

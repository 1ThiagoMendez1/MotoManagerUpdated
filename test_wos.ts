import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: wo } = await supabase.from('work_orders').select('id, assigned_mechanic_id, subtotal').limit(5);
  console.log("Work Orders:", wo);

  const { data: wos } = await supabase.from('work_order_services').select('*').limit(5);
  console.log("Work Order Services:", wos);
}
main();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('work_order_services')
    .select(`
      id,
      work_order_id,
      description,
      total,
      created_at,
      status,
      work_orders!inner (
        organization_id,
        sales!inner (
          status,
          created_at
        )
      )
    `)
    .eq('work_orders.sales.status', 'paid')
    .limit(5);

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}
main();

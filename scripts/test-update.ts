import { createClient } from '@supabase/supabase-js'; 
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } }); 
async function test() { 
  const { data: woList } = await supabaseAdmin.from('work_orders').select('id, organization_id').limit(1);
  if (!woList || woList.length === 0) return console.log('No work orders');
  const wo = woList[0];
  const { error } = await supabaseAdmin.from('work_orders').update({ status: 'delivered', quote_status: 'approved', completed_at: new Date().toISOString() }).eq('id', wo.id).select(`
                motorcycle_id, 
                order_number,
                customer_observations,
                motorcycles (
                    customer_id,
                    brand,
                    model,
                    license_plate,
                    model_year,
                    customers (
                        first_name,
                        last_name,
                        phone
                    )
                ),
                profiles!work_orders_assigned_mechanic_id_fkey (
                    first_name,
                    last_name
                )
            `).single();
  console.log('Update Error:', JSON.stringify(error, null, 2));
}
test();





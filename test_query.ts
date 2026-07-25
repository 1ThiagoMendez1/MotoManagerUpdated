import { createAdminClient } from './src/lib/auth-server';
async function main() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      motorcycles (
        brand,
        model,
        license_plate,
        customers (
          first_name,
          last_name
        )
      ),
      organizations (
        name
      ),
      mechanic:profiles!work_orders_assigned_mechanic_id_fkey (
        first_name,
        last_name
      ),
      images:work_order_evidences (
        id, image_url, description
      )
    `)
    .limit(1);
  console.log('ERROR:', JSON.stringify(error, null, 2));
  console.log('DATA:', data);
}
main();

import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** A quote is private. Plate and order number are never authentication factors.
 * This guard is used both when rendering and when saving a quote response. */
export async function canAccessOwnCustomerQuote(workOrderId: string): Promise<boolean> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(workOrderId)) return false;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email_confirmed_at) return false;

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from('work_orders')
      .select('id, organization_id, customer_id, motorcycle_id')
      .eq('id', workOrderId).maybeSingle();
    if (error || !order?.organization_id || !order.motorcycle_id) return false;

    const { data: bike, error: bikeError } = await admin
      .from('motorcycles')
      .select('id, organization_id, customer_id')
      .eq('id', order.motorcycle_id).eq('organization_id', order.organization_id).maybeSingle();
    if (bikeError || !bike?.customer_id) return false;
    if (order.customer_id && order.customer_id !== bike.customer_id) return false;

    const [{ data: link, error: linkError }, { data: organization, error: orgError }] = await Promise.all([
      admin.from('workshop_customer_accounts')
        .select('customer_id').eq('user_id',user.id)
        .eq('organization_id',order.organization_id)
        .eq('customer_id',bike.customer_id).maybeSingle(),
      admin.from('organizations')
        .select('id').eq('id',order.organization_id).eq('status','active').maybeSingle(),
    ]);
    return !linkError && !orgError && Boolean(link && organization);
  } catch {
    return false;
  }
}

import 'server-only';

import { requireWorkshop } from '@/lib/auth-server';
import { getMotorcycles, getTechnicians } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

/**
 * Shared options for the new order dialogs in /work-orders and /[tenant].
 * Delivered orders remain in the motorcycle history; they do not prevent a
 * future intake. Motorcycles with a still-open order are shown disabled.
 */
export async function getOrderCreationOptions() {
  const user = await requireWorkshop();
  const [{ items: motorcycles }, { items: technicians }] = await Promise.all([
    getMotorcycles({ limit: 1000 }),
    getTechnicians({ limit: 1000 }),
  ]);

  if (motorcycles.length === 0) {
    return { motorcycles, technicians, unavailableMotorcycleIds: [] as string[] };
  }

  const supabase = await createClient();
  const { data: openOrders, error } = await supabase
    .from('work_orders')
    .select('motorcycle_id')
    .eq('organization_id', user.workshopId)
    .in('motorcycle_id', motorcycles.map(moto => moto.id))
    .not('status', 'in', '(delivered,delivered_quote_rejected,cancelled)');

  if (error) {
    console.error('[order-creation-options] Active-order lookup failed:', error.code);
    // Fail closed: do not allow order creation if we cannot check duplicates.
    throw new Error('No se pudieron comprobar las órdenes abiertas del taller.');
  }

  return {
    motorcycles,
    technicians,
    unavailableMotorcycleIds: [...new Set((openOrders || [])
      .map(order => order.motorcycle_id)
      .filter((id): id is string => Boolean(id)))],
  };
}

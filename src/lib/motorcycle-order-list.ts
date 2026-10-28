import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getMotorcycles } from '@/lib/data';
import type { Motorcycle } from '@/lib/types';
import { buildMotorcycleOrderIndex, type MotorcycleOrderRow } from '@/lib/motorcycle-order-groups';

/**
 * Load every matching motorcycle in bounded pages before applying the status
 * tabs. Filtering AFTER a 10-row page would make category tabs look empty and
 * their counts wrong, even when the organization has matching motorcycles.
 */
async function loadMatchingMotorcycles(query: string): Promise<Motorcycle[]> {
  const limit = 200;
  const first = await getMotorcycles({ query, page: 1, limit });
  const motorcycles = [...first.items];
  for (let start = 2; start <= first.totalPages; start += 4) {
    const pages = Array.from(
      { length: Math.min(4, first.totalPages - start + 1) },
      (_, offset) => getMotorcycles({ query, page: start + offset, limit }),
    );
    const results = await Promise.all(pages);
    for (const result of results) motorcycles.push(...result.items);
  }
  return motorcycles;
}

export async function getMotorcycleOrderList(query: string, organizationId: string) {
  const motorcycles = await loadMatchingMotorcycles(query);
  if (motorcycles.length === 0) {
    return { motorcycles, orderIndex: buildMotorcycleOrderIndex([]) };
  }

  const supabase = await createClient();
  const orders: MotorcycleOrderRow[] = [];
  const ids = motorcycles.map(motorcycle => motorcycle.id);

  // Limit URL size; paginate order history instead of relying on PostgREST's
  // configurable max_rows (often 1000). Only the logged-in workshop is read.
  for (let start = 0; start < ids.length; start += 100) {
    const motorcycleIds = ids.slice(start, start + 100);
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, motorcycle_id, status, created_at, order_number')
        .eq('organization_id', organizationId)
        .in('motorcycle_id', motorcycleIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + 499);

      if (error) {
        console.error('[motorcycles] Failed to resolve work order states:', error.code);
        throw new Error('No se pudo consultar el estado de las órdenes de trabajo.');
      }
      const batch = (data || []) as MotorcycleOrderRow[];
      orders.push(...batch);
      if (batch.length < 500) break;
      offset += batch.length;
    }
  }

  return { motorcycles, orderIndex: buildMotorcycleOrderIndex(orders) };
}

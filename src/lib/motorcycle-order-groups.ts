/**
 * Un estado por motocicleta, sin perder la historia de órdenes.
 * Una orden abierta tiene prioridad sobre una entregada anterior.
 * 'completed' significa reparada, pero aún no entregada.
 */
export type MotorcycleTab = 'all' | 'without' | 'active' | 'finished';
export type MotorcycleOrderRow = {
  id: string;
  motorcycle_id: string | null;
  status: string;
  created_at: string | null;
  order_number: number | string | null;
};
export type MotorcycleOrderInfo = {
  id: string;
  status: string;
  label: string;
  tab: 'active' | 'finished';
  createdAt: string | null;
  orderNumber: string | null;
};

const closedStatuses = new Set(['delivered', 'delivered_quote_rejected', 'cancelled']);

export function isClosedMotorcycleOrder(status: string): boolean {
  return closedStatuses.has(status);
}

export function motorcycleOrderLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Borrador';
    case 'received': return 'Nueva orden';
    case 'diagnosis': return 'Diagnosticando';
    case 'in_progress': return 'En proceso';
    case 'completed': return 'Reparada · pendiente de entrega';
    case 'delivered': return 'Entregada';
    case 'delivered_quote_rejected': return 'Entregada · cotización rechazada';
    case 'cancelled': return 'Cancelada';
    default: return status.replace(/_/g, ' ');
  }
}

export function buildMotorcycleOrderIndex(
  rows: readonly MotorcycleOrderRow[],
): Map<string, MotorcycleOrderInfo> {
  const byMotorcycle = new Map<string, MotorcycleOrderInfo>();
  for (const row of rows) {
    if (!row.motorcycle_id) continue;
    const tab = isClosedMotorcycleOrder(row.status) ? 'finished' : 'active';
    const candidate: MotorcycleOrderInfo = {
      id: row.id,
      status: row.status,
      label: motorcycleOrderLabel(row.status),
      tab,
      createdAt: row.created_at,
      orderNumber: row.order_number == null ? null : String(row.order_number),
    };
    const previous = byMotorcycle.get(row.motorcycle_id);
    if (!previous ||
      (tab === 'active' && previous.tab === 'finished') ||
      (tab === previous.tab && (candidate.createdAt ?? '') > (previous.createdAt ?? ''))) {
      byMotorcycle.set(row.motorcycle_id, candidate);
    }
  }
  return byMotorcycle;
}

export function motorcycleMatchesTab(
  id: string, tab: MotorcycleTab, index: ReadonlyMap<string, MotorcycleOrderInfo>
): boolean {
  if (tab === 'all') return true;
  const classification = index.get(id)?.tab ?? 'without';
  return classification === tab;
}

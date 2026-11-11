/** An advance is cash received, not an issued service invoice. */
export function isOrderDeposit(sale: { is_deposit?: boolean | null; notes?: string | null; sale_number?: string | null }) {
  return sale.is_deposit === true || /^Abono de orden\b/i.test(sale.notes || '') || /^(?:SALE-)?AB-/i.test(sale.sale_number || '');
}

export function isIssuedServiceSale(sale: { is_deposit?: boolean | null; notes?: string | null; sale_number?: string | null; status?: string }) {
  return !isOrderDeposit(sale) && Boolean(sale.sale_number) && ['paid','pending'].includes(sale.status || '');
}

// `sales.total` remains the money collected at checkout, preserving cash books.
// `invoice_total` records the full invoice before subtracting advances.
export function serviceInvoiceTotal(sale: { invoice_total?: number | string | null; total?: number | string | null; work_order_id?: string | null }, deposit = 0) {
  return sale.invoice_total != null ? Number(sale.invoice_total) : Number(sale.total || 0) + (sale.work_order_id ? deposit : 0);
}

export function colombiaSettlementRange(from: string, to: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
  if (!valid(from) || !valid(to) || from > to) throw new Error('Selecciona un periodo válido.');
  const start = new Date(`${from}T00:00:00-05:00`);
  const end = new Date(`${to}T00:00:00-05:00`);
  end.setUTCDate(end.getUTCDate()+1);
  return { start: start.toISOString(), endExclusive: end.toISOString() };
}

export function inventorySearchMatch<T extends { id: string; name: string; sku: string }>(inventory: T[], input: string) {
  const key = input.trim().toLocaleLowerCase('es-CO');
  const matches = key ? inventory.filter(item => item.name.toLocaleLowerCase('es-CO').includes(key) || item.sku.toLocaleLowerCase('es-CO').includes(key)) : inventory;
  const exact = key ? matches.filter(item => item.sku.trim().toLocaleLowerCase('es-CO') === key) : [];
  return { matches, selectedId: exact.length === 1 ? exact[0].id : key && matches.length === 1 ? matches[0].id : '' };
}

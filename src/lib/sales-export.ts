'use client';

import type { Sale } from './types';
export type SaleExportFilters = { dateFrom?: string; dateTo?: string; type?: 'direct' | 'service' | 'all' };

export async function loadSalesExport(filters: SaleExportFilters = {}): Promise<Sale[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const response = await fetch(`/api/workshop/sales/export?${params}`, { cache: 'no-store' });
  if (!response.ok || response.redirected) throw new Error('Could not load export');
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Invalid export');
  return data.items;
}

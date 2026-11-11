import { colombiaSettlementRange } from './work-order-finance';

export const PARTS_PROFIT_SORTS = ['profit','quantity','margin','revenue','stock','idle'] as const;
export type PartsProfitSort = typeof PARTS_PROFIT_SORTS[number];
export interface PartsProfitFilters {
  from: string; to: string; query: string; sort: PartsProfitSort; includeEstimates: boolean; page: number;
}
export interface PartProfitRow {
  item_id: string; name: string; sku: string | null; category: string; status: string;
  units: number; revenue: number; sales_count: number; last_sale_at: string | null;
  recorded_units: number; estimated_units: number; missing_units: number; costed_units: number;
  costed_revenue: number; cost_total: number | null; profit: number | null; margin: number | null;
  stock: number; minimum_stock: number; daily_units: number; coverage_days: number | null;
}
export interface PartsProfitReport {
  from: string; to: string; days: number; include_estimates: boolean; page: number; total_items: number; total_pages: number;
  summary: { revenue: number; units: number; sales_count: number; recorded_units: number; estimated_units: number;
    missing_units: number; costed_units: number; costed_revenue: number; cost_total: number; profit: number;
    margin: number | null; idle_items: number; sold_items: number };
  rows: PartProfitRow[]; top_rotating: PartProfitRow[]; top_profit: PartProfitRow[];
}
export function partsDatePreset(preset: 'month'|'year'|'30days',now=new Date()) {
  const to=now.toLocaleDateString('sv-SE',{timeZone:'America/Bogota'});
  const date=new Date(`${to}T12:00:00Z`);
  if (preset==='month') date.setUTCDate(1);
  else if (preset==='year') { date.setUTCMonth(0); date.setUTCDate(1); }
  else date.setUTCDate(date.getUTCDate()-29);
  return {from:date.toISOString().slice(0,10),to};
}
export function validatePartsProfitFilters(input: PartsProfitFilters) {
  const range=colombiaSettlementRange(input.from,input.to);
  if (Date.parse(range.endExclusive)-Date.parse(range.start)>366*86400000) throw new Error('Selecciona un periodo de hasta 366 días.');
  if (!PARTS_PROFIT_SORTS.includes(input.sort) || typeof input.includeEstimates!=='boolean' || !Number.isInteger(input.page) || input.page<1 || input.page>100000 || typeof input.query!=='string' || input.query.length>100) throw new Error('Revisa los filtros de la consulta.');
  return {...input,query:input.query.trim()};
}
export function partCostLabel(row: PartProfitRow) {
  if (row.units===0) return 'Sin ventas';
  if (row.costed_units===0) return row.estimated_units>0 ? 'Histórico estimado' : 'Sin costo registrado';
  if (row.costed_units<row.units) return 'Costo parcial';
  return row.estimated_units>0 ? 'Incluye estimación' : 'Costo registrado';
}

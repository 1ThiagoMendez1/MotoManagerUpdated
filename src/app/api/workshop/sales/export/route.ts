import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/auth-server';
import { getSales } from '@/lib/data';

export async function GET(request: NextRequest) {
  await authorize('/sales');
  const { searchParams } = request.nextUrl;
  const filters = {
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    type: ['direct', 'service'].includes(searchParams.get('type') || '') ? searchParams.get('type')! : 'all',
  };
  for (const date of [filters.dateFrom, filters.dateTo]) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }
  }
  const first = await getSales({ ...filters, page: 1, limit: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) items.push(...(await getSales({ ...filters, page, limit: 100 })).items);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } });
}

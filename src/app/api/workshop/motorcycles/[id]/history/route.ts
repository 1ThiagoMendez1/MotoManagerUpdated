import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth-server';
import { getWorkOrders } from '@/lib/data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await authorize('/motorcycles');
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return NextResponse.json({ error: 'Motocicleta inválida' }, { status: 400 });
  const first = await getWorkOrders({ motorcycleId: id, page: 1, limit: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    items.push(...(await getWorkOrders({ motorcycleId: id, page, limit: 100 })).items);
  }
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } });
}

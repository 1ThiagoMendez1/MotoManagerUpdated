import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth-server';
import { getOrderCreationOptions } from '@/lib/work-orders/order-creation-options';

export async function GET() {
  await authorize('/work-orders');
  return NextResponse.json(await getOrderCreationOptions(), { headers: { 'Cache-Control': 'private, no-store' } });
}

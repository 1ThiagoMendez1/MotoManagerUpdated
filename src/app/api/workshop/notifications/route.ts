import { NextResponse } from 'next/server';
import { getNotificationsForUser } from '@/lib/actions/notifications';

export async function GET() {
  const result = await getNotificationsForUser();
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
}

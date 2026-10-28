import { NextResponse } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth-server';
import { isSuperAdmin } from '@/lib/super-admin';
import { cacheMetrics } from '@/lib/cache/workshop-cache';
import { cacheConnectionStatus } from '@/lib/cache/redis';

export async function GET() {
  const user = await getCurrentUserServer();
  if (!user || !isSuperAdmin(user)) return NextResponse.json({ error: 'No autorizado' }, { status: user ? 403 : 401 });
  return NextResponse.json({ cache: cacheConnectionStatus(), counters: cacheMetrics, uptimeSeconds: Math.floor(process.uptime()) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

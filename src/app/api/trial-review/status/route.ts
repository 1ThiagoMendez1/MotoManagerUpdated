import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMyTrialReview } from '@/lib/trial-review-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers });
  try {
    const review = await getMyTrialReview();
    return NextResponse.json({ paused: !!review }, { headers });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el acceso.' }, { status: 503, headers });
  }
}

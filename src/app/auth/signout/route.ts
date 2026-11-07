import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrialSignoutOrigin } from '@/lib/trial-review';

export async function POST(request: NextRequest) {
  const origin = getTrialSignoutOrigin(process.env.NEXT_PUBLIC_APP_URL || 'https://motomanager.com.co', request.headers.get('origin'));
  if (!origin) {
    return NextResponse.json({ error: 'Origen inválido.' }, { status: 403 });
  }
  const client = await createClient();
  await client.auth.signOut();
  return NextResponse.redirect(new URL('/login', origin), 303);
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen inválido.' }, { status: 403 });
  }
  const client = await createClient();
  await client.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}

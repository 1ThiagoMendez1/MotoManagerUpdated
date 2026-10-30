import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeWorkshopReturnPath } from '@/lib/workshops/enrollment';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeWorkshopReturnPath(request.nextUrl.searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // A relative Location preserves the public host behind Dokploy's proxy.
    // request.url may contain an internal hostname; never redirect to it.
    if (!error) return new NextResponse(null, { status: 303, headers: { Location: next, 'Cache-Control': 'no-store' } });
  }
  return new NextResponse(null, { status: 303, headers: { Location: `${next}?auth_error=1`, 'Cache-Control': 'no-store' } });
}

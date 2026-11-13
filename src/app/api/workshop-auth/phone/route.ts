import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyticsClientIp } from '@/lib/analytics/web-http';
import { PHONE_AUTH_COOKIE, PHONE_AUTH_COOLDOWN, PHONE_AUTH_TTL, PHONE_AUTH_ERRORS, phoneRequestSchema, phoneVerifySchema } from '@/lib/workshop-phone-shared';
import { newPhoneBrowser, phoneAuthHash, phoneAuthOrigin } from '@/lib/workshop-phone-auth';
import { phoneAuthEnabled, phoneLoginEnabled, phoneAuthRpc, requestWorkshopPhone, verifyWorkshopPhone } from '@/lib/workshop-phone-auth-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data: object, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' } });
const failure = (code: string) => json({ error: PHONE_AUTH_ERRORS[code] || PHONE_AUTH_ERRORS.unavailable, code }, code === 'limited' ? 429 : code === 'unavailable' ? 503 : 400);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('challenge');
  if (!id) return json({ enabled: phoneAuthEnabled(), loginEnabled: phoneLoginEnabled() });
  const browser = request.cookies.get(PHONE_AUTH_COOKIE)?.value || '';
  if (!(phoneAuthEnabled() || phoneLoginEnabled()) || !/^[\w-]{43}$/.test(browser) || !phoneVerifySchema.shape.challenge.safeParse(id).success) return failure('invalid');
  try {
    const result = await phoneAuthRpc('delivery', { id, browserHash: phoneAuthHash('browser', browser, process.env.MOBILE_OTP_PEPPER || '') });
    return result.error ? failure('invalid') : json(result);
  } catch { return failure('unavailable'); }
}

async function smallJson(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 4096 || !request.body) throw new Error('Invalid body');
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error('Invalid body'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function POST(request: NextRequest) {
  if (!phoneAuthOrigin(request.headers.get('origin'), process.env.NODE_ENV !== 'production') ||
    request.headers.get('sec-fetch-site') === 'cross-site' || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Abre el formulario desde MotoManager.' }, 403);
  if (!(phoneAuthEnabled() || phoneLoginEnabled())) return failure('unavailable');
  let input: any;
  try { input = await smallJson(request); } catch { return failure('invalid'); }
  try {
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) return json({ redirect: '/dashboard' });
    const browser = request.cookies.get(PHONE_AUTH_COOKIE)?.value || '';
    if (input?.action === 'request') {
      const parsed = phoneRequestSchema.safeParse(input);
      if (!parsed.success) return json({ code: 'validation', error: parsed.error.issues[0]?.message || 'Revisa los datos.' }, 400);
      if (parsed.data.mode === 'signup' ? !phoneAuthEnabled() : !phoneLoginEnabled()) return failure('unavailable');
      const nonce = /^[\w-]{43}$/.test(browser) ? browser : newPhoneBrowser();
      const ip = analyticsClientIp(request.headers, process.env.ANALYTICS_CLIENT_IP_HEADER || 'x-real-ip') || 'unknown';
      const result = await requestWorkshopPhone(parsed.data, nonce, ip);
      if ('error' in result) return failure(result.error);
      const response = json({ ...result, expiresIn: PHONE_AUTH_TTL, retryAfter: PHONE_AUTH_COOLDOWN });
      response.cookies.set(PHONE_AUTH_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/workshop-auth', maxAge: 900 });
      return response;
    }
    const parsed = phoneVerifySchema.safeParse(input);
    if (!parsed.success || !/^[\w-]{43}$/.test(browser)) return failure('invalid');
    const result = await verifyWorkshopPhone(parsed.data.challenge, parsed.data.code, browser);
    return 'error' in result ? failure(result.error) : json(result);
  } catch { return failure('unavailable'); }
}

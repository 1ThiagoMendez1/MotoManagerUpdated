import { persistWebhook } from '@/lib/whatsapp-coexistence/webhook';
import { NextRequest, NextResponse } from 'next/server';
import { configuration } from '@/lib/whatsapp-coexistence/server';
import { validSignature } from '@/lib/whatsapp-coexistence/core';
import { timingSafeEqual } from 'node:crypto';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams, expected = configuration().verifyToken;
  const supplied = params.get('hub.verify_token') || '', challenge = params.get('hub.challenge') || '';
  if (expected.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)) ||
    params.get('hub.mode') !== 'subscribe' || !/^\d{1,100}$/.test(challenge)) return new NextResponse('Forbidden', { status: 403 });
  return new NextResponse(challenge, { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
}
export async function POST(request: NextRequest) {
  const config = configuration();
  if (!config.appSecret || !config.encryptionKey) return new NextResponse('Unavailable', { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse('Invalid body', { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 5 * 1024 * 1024) { await reader.cancel(); return new NextResponse('Payload too large', { status: 413 }); }
    chunks.push(chunk.value);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'), config.appSecret)) return new NextResponse('Forbidden', { status: 403 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return new NextResponse('Invalid JSON', { status: 400 }); }
  if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return NextResponse.json({ received: true });
  try {
    await persistWebhook(body);
    return NextResponse.json({ received: true });
  } catch { return new NextResponse('Persistence unavailable', { status: 503 }); }
}

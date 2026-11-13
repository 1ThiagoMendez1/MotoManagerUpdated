import { apiOwner } from '@/lib/whatsapp-coexistence/authorization';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { beginConnection, completeConnection, configuration, enabledFor, getConnection, patchConnection, publicConnection, refreshConnection, serviceRpc, setupReady } from '@/lib/whatsapp-coexistence/server';
import { digest, unseal } from '@/lib/whatsapp-coexistence/core';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const COOKIE = '__Host-mm-wa-state';
const response = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const complete = z.object({ action: z.literal('complete'), state: z.string().regex(/^[\w-]{43}$/), code: z.string().min(10).max(4096),
  wabaId: z.string().regex(/^\d{5,30}$/), phoneId: z.string().regex(/^\d{5,30}$/).optional() }).strict();

export async function GET(request: NextRequest) {
  const user = await apiOwner();
  if (!user) return response({ error: 'No tienes permiso para administrar esta conexión.' }, 403);
  try {
    const config = configuration(), allowed = enabledFor(user.workshopId!) && setupReady();
    const connection = await getConnection(user.workshopId!);
    const before = request.nextUrl.searchParams.get('before'), beforeId = request.nextUrl.searchParams.get('beforeId');
    if (before && (!z.string().datetime({ offset: true }).safeParse(before).success || !beforeId || beforeId.length > 300)) return response({ error: 'Página no válida.' }, 400);
    const messages = request.nextUrl.searchParams.get('messages') === '1' ? await serviceRpc<any[]>('messages', { org: user.workshopId, ...(before ? { before, beforeId } : {}) }) : [];
    return response({ allowed, connection: publicConnection(connection),
      sdk: allowed ? { appId: config.appId, configId: config.configId, version: config.version,
        onboardingUrl: new URL('/dashboard/whatsapp', config.callback).toString() } : null,
      messages: messages.map(item => {
        try { return JSON.parse(unseal(item.payload_ciphertext, user.workshopId!, config.encryptionKey)); } catch { return null; }
      }).filter(Boolean) });
  } catch { return response({ error: 'No se pudo consultar WhatsApp. Intenta nuevamente.' }, 503); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json'))
    return response({ error: 'Solicitud no válida.' }, 403);
  const user = await apiOwner();
  if (!user) return response({ error: 'No tienes permiso para administrar esta conexión.' }, 403);
  const length = Number(request.headers.get('content-length'));
  if (length > 10000) return response({ error: 'Solicitud demasiado grande.' }, 413);
  let data: any;
  try { const raw = await request.text(); if (raw.length > 10000) return response({ error: 'Solicitud demasiado grande.' }, 413); data = JSON.parse(raw); }
  catch { return response({ error: 'Solicitud no válida.' }, 400); }
  try {
    if (['begin', 'complete'].includes(data.action) && request.headers.get('origin') !== new URL(configuration().callback).origin)
      return response({ error: 'Abre la conexión desde el panel principal de MotoManager.' }, 403);
    if (data.action === 'begin') {
      const state = await beginConnection(user.workshopId!, user.userId);
      const result = response({ state });
      result.cookies.set(COOKIE, digest(state), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 600 });
      return result;
    }
    if (data.action === 'complete') {
      const parsed = complete.safeParse(data);
      if (!parsed.success) return response({ error: 'Meta no entregó los datos necesarios. Vuelve a conectar.' }, 400);
      const cookie = request.cookies.get(COOKIE)?.value || '';
      const expected = digest(parsed.data.state);
      if (!/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))) return response({ error: 'La conexión venció. Empieza de nuevo.' }, 403);
      const result = response({ connection: await completeConnection(user.workshopId!, user.userId, parsed.data) });
      result.cookies.set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
      return result;
    }
    if (data.action === 'pause') {
      await patchConnection(user.workshopId!, { status: 'paused' });
      return response({ connection: publicConnection(await getConnection(user.workshopId!)) });
    }
    if (data.action === 'refresh') {
      if (!enabledFor(user.workshopId!) || !setupReady()) return response({ error: 'La conexión todavía no está habilitada.' }, 409);
      return response({ connection: await refreshConnection(user.workshopId!, true) });
    }
    return response({ error: 'Acción no válida.' }, 400);
  } catch (error) {
    // Never serialize a Graph response, URL, access token, or server stack into the browser.
    const message = error instanceof Error && !error.message.startsWith('Meta no confirmó') ? error.message : 'Meta no confirmó la operación. Revisa tu conexión.';
    return response({ error: message }, 400);
  }
}

import { createCipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const MAX_WHATSAPP_WEBHOOK_BYTES = 5 * 1024 * 1024;
export type WebhookReceipt = { appId: string; digest: string; ciphertext: string; bytes: number };
type Config = { appId?: string; appSecret?: string; encryptionKey?: string };
const reply = (body: string, status: number) => new Response(body, {
  status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

export function verifyWhatsAppWebhook(request: Request, expected: string) {
  const params = new URL(request.url).searchParams;
  const supplied = params.get('hub.verify_token') || '';
  const challenge = params.get('hub.challenge') || '';
  if (['hub.mode', 'hub.verify_token', 'hub.challenge'].some(key => params.getAll(key).length !== 1) ||
      expected.length < 32 || expected.length > 256 || params.get('hub.mode') !== 'subscribe' ||
      !/^\d{1,100}$/.test(challenge) || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return reply('Forbidden', 403);
  return reply(challenge, 200);
}

// Kept independent of server credentials so the entire protocol can be tested
// with fixtures. No event is acknowledged until durable persistence succeeds.
export async function receiveWhatsAppWebhook(
  request: Request, config: Config, persist: (receipt: WebhookReceipt, payload: object) => Promise<void>,
) {
  const { appId = '', appSecret = '', encryptionKey = '' } = config;
  const key = Buffer.from(encryptionKey, 'base64');
  if (!/^\d{5,30}$/.test(appId) || appSecret.length < 20 || key.length !== 32) return reply('Unavailable', 503);
  const signature = request.headers.get('x-hub-signature-256') || '';
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return reply('Forbidden', 403);
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_WHATSAPP_WEBHOOK_BYTES)) return reply('Payload too large', 413);
  const reader = request.body?.getReader();
  if (!reader) return reply('Invalid body', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_WHATSAPP_WEBHOOK_BYTES) { await reader.cancel(); return reply('Payload too large', 413); }
      chunks.push(chunk.value);
    }
  } catch { return reply('Invalid body', 400); }
  const raw = Buffer.concat(chunks);
  const expected = createHmac('sha256', appSecret).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) return reply('Forbidden', 403);
  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
  catch { return reply('Invalid JSON', 400); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return reply('Invalid event', 400);
  const event = payload as { object?: unknown; entry?: unknown };
  if (event.object !== 'whatsapp_business_account') return reply('Ignored', 200);
  if (!Array.isArray(event.entry)) return reply('Invalid event', 400);
  const digest = createHash('sha256').update(raw).digest('hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`motomanager:whatsapp-webhook:v1:${appId}:${digest}`));
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  const ciphertext = ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  try { await persist({ appId, digest, ciphertext, bytes: size }, payload); }
  catch { return reply('Persistence unavailable', 503); }
  return reply('EVENT_RECEIVED', 200);
}

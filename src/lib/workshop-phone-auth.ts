import { createHmac, randomBytes, randomInt } from 'node:crypto';
export * from './workshop-phone-shared';

export function phoneAuthHash(kind: 'code' | 'browser' | 'rate', value: string, secret: string) {
  if (secret.length < 32) throw new Error('Phone authentication secret unavailable');
  return createHmac('sha256', secret).update('workshop-phone-v1:' + kind + ':' + value).digest('hex');
}
export const newPhoneCode = () => String(randomInt(100000, 1000000));
export const newPhonePassword = () => randomBytes(36).toString('base64url') + 'aA1!';
export const newPhoneBrowser = () => randomBytes(32).toString('base64url');

export function phoneAuthOrigin(origin: string | null, development = false) {
  if (!origin) return false;
  return ['https://motomanager.com.co', 'https://www.motomanager.com.co'].includes(origin) ||
    development && /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(origin);
}

/** AUTHENTICATION / COPY_CODE. No retry: a timeout may have accepted the send. */
export async function sendWorkshopPhoneCode(phone: string, code: string, config: { token: string; phoneId: string; template: string; language: string }, send: typeof fetch = fetch) {
  if (!/^[1-9]\d{9,14}$/.test(phone) || !/^\d{6}$/.test(code) || !/^\d{5,30}$/.test(config.phoneId) ||
    !/^[a-z0-9_]{1,100}$/.test(config.template) || !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(config.language) || !config.token) throw new Error('Phone sender unavailable');
  try {
    const response = await send('https://graph.facebook.com/v27.0/' + config.phoneId + '/messages', {
      method: 'POST', headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'template', template: {
        name: config.template, language: { code: config.language }, components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      } }), signal: AbortSignal.timeout(12000), cache: 'no-store',
    });
    const body = await response.json().catch(() => null);
    const messageId = body?.messages?.[0]?.id;
    if (response.ok && typeof messageId === 'string' && messageId.length <= 300) return { accepted: true as const, messageId };
    return { accepted: false as const, ambiguous: response.ok || response.status >= 500 };
  } catch { return { accepted: false as const, ambiguous: true }; }
}


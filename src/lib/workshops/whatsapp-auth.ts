import { z } from 'zod';
import { normalizeMobilePhone } from '@/lib/mobile-otp';

export const QR_WHATSAPP_TEMPLATE = 'codigo_registro_qr';
export const QR_WHATSAPP_LANGUAGE = 'es_CO';
const aliasDomain = '@clientes.motomanager.com.co';

export const qrCodeRequestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,150}$/),
  phone: z.string().transform(value => normalizeMobilePhone(value))
    .pipe(z.string().regex(/^57[0-9]{10}$/)),
});
export const qrCodeVerificationSchema = qrCodeRequestSchema.extend({
  code: z.string().regex(/^[0-9]{6}$/),
});

export function phoneAccountEmail(phone: string): string {
  if (!/^57[0-9]{10}$/.test(phone)) throw new Error('Número inválido');
  return phone + aliasDomain;
}

export function phoneMatchesAccount(email: string | undefined, suppliedPhone: string): boolean {
  if (!email?.toLowerCase().endsWith(aliasDomain)) return true;
  const normalized = normalizeMobilePhone(suppliedPhone);
  return Boolean(normalized && email.toLowerCase() === phoneAccountEmail(normalized));
}

/** Plantilla de Meta: AUTENTICACIÓN, es_CO, "Copiar código", sin encabezado.
 * El botón OTP se transmite como un componente URL con la variable del código. */
export function buildQrCodeTemplate(code: string) {
  if (!/^[0-9]{6}$/.test(code)) throw new Error('Código inválido');
  return {
    name: QR_WHATSAPP_TEMPLATE,
    language: { code: QR_WHATSAPP_LANGUAGE },
    components: [
      { type: 'body', parameters: [{ type: 'text', text: code }] },
      { type: 'button', sub_type: 'url', index: '0',
        parameters: [{ type: 'text', text: code }] },
    ],
  };
}

export async function sendQrCodeViaMeta(phone: string, code: string): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !/^57[0-9]{10}$/.test(phone)) return false;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
  if (!/^v[0-9]{1,2}\.[0-9]{1,2}$/.test(version)) return false;
  try {
    const response = await fetch('https://graph.facebook.com/' + version + '/' +
      encodeURIComponent(phoneId) + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: phone, type: 'template',
        template: buildQrCodeTemplate(code),
      }),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (!response.ok) {
      const meta = await response.json().catch(() => ({}));
      const code = meta?.error?.code;
      console.warn('[qr-whatsapp] Meta rejected template', {
        httpStatus: response.status, metaCode: typeof code === 'number' ? code : null,
      });
    }
    return response.ok;
  } catch {
    // Un fallo de red podría significar que Meta recibió el mensaje: no reintentar automáticamente.
    console.warn('[qr-whatsapp] Could not confirm message acceptance');
    return false;
  }
}

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function seal(value: string, organizationId: string, key: string): string {
  const secret = Buffer.from(key, 'base64');
  if (secret.length !== 32) throw new Error('WhatsApp encryption key must be 32 bytes.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  cipher.setAAD(Buffer.from(organizationId));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function unseal(value: string, organizationId: string, key: string): string {
  const [version, iv, tag, ciphertext, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || ciphertext === undefined || extra) throw new Error('Invalid encrypted WhatsApp data.');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(organizationId));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function validSignature(raw: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), createHmac('sha256', secret).update(raw).digest());
}
export function trustedMetaOrigin(origin: string): boolean {
  return ['https://www.facebook.com', 'https://web.facebook.com', 'https://business.facebook.com'].includes(origin);
}
export function recipientNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length === 10 ? '57' + digits : digits;
  if (!/^\d{11,15}$/.test(number)) throw new Error('Número WhatsApp inválido.');
  return number;
}
export const metaId = (value: unknown): value is string => typeof value === 'string' && /^\d{5,30}$/.test(value);
export const safeParameter = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 900) || 'No especificado';

// Purpose-specific Utility templates. Each customer's WABA must approve its own copies.
export const noticeTemplates = {
  reminder: { name: 'motomanager_recordatorio_v1', body: 'Hola {{1}}, {{2}} te recuerda el mantenimiento recomendado para tu motocicleta {{3}}: {{4}}. Responde si deseas agendar o dejar de recibir estos recordatorios.', example: ['Ana', 'Taller Ejemplo', 'AKT, ABC12D', 'Cambio de aceite'] },
  order: { name: 'motomanager_orden_v1', body: 'Hola {{1}}, en {{2}} actualizamos el estado de tu orden de servicio {{3}}: {{4}}. Motocicleta: {{5}}. Puedes responder a este mensaje para consultar los detalles de tu servicio.', example: ['Ana', 'Taller Ejemplo', '150', 'Reparado. Recoge tu moto de lunes a viernes de 8 a 5', 'AKT, ABC12D'] },
  quote: { name: 'motomanager_cotizacion_v1', body: 'Hola {{1}}, en {{2}} está lista la cotización de tu orden de servicio {{3}}. Consulta los detalles y confirma tu decisión en tu portal: {{4}}. Responde a este mensaje si necesitas ayuda con esta cotización.', example: ['Ana', 'Taller Ejemplo', '150', 'https://motomanager.app/cotizacion/ejemplo'] },
  receipt: { name: 'motomanager_comprobante_v1', body: 'Hola {{1}}, {{2}} confirma el pago de tu compra o servicio {{3}} por {{4}}. Detalle del comprobante: {{5}}. Guarda esta confirmación y responde a este mensaje si necesitas ayuda con tu pago.', example: ['Ana', 'Taller Ejemplo', '150', '$80.000', 'Cambio de aceite, efectivo'] },
  appointment: { name: 'motomanager_cita_v1', body: 'Hola {{1}}, tu cita de servicio en {{2}} está confirmada para {{3}}. Responde a este mensaje si necesitas cambiar o cancelar esta cita. Te esperamos para atender tu motocicleta.', example: ['Ana', 'Taller Ejemplo', '12 de noviembre a las 9:00 a. m.'] },
} as const;
export type NoticeKind = keyof typeof noticeTemplates;
export type Notice = { kind: NoticeKind; values: unknown[] };
export function templateDefinition(kind: NoticeKind) {
  const item = noticeTemplates[kind];
  return { name: item.name, language: 'es_CO', category: kind === 'reminder' ? 'MARKETING' : 'UTILITY', components: [{ type: 'BODY', text: item.body, example: { body_text: [[...item.example]] } }] };
}
export function noticePayload(to: string, notice: Notice) {
  if (notice.values.length !== noticeTemplates[notice.kind].example.length) throw new Error('Invalid WhatsApp template parameters.');
  return { messaging_product: 'whatsapp', to: recipientNumber(to), type: 'template', template: {
    name: noticeTemplates[notice.kind].name, language: { code: 'es_CO' },
    components: [{ type: 'body', parameters: notice.values.map(text => ({ type: 'text', text: safeParameter(text) })) }],
  } };
}

export class MetaError extends Error {
  constructor(public status: number, public code: number | null) { super('Meta no confirmó la operación.'); }
}
export function graphClient(config: { version: string; appId: string; appSecret: string }, transport: typeof fetch = fetch) {
  if (!/^v\d+\.0$/.test(config.version)) throw new Error('Invalid Graph API version.');
  const base = 'https://graph.facebook.com/' + config.version + '/';
  const request = async (path: string, token: string, body?: object, query: Record<string, string> = {}): Promise<any> => {
    // Paths only originate in server code. Do not accept arbitrary callback URLs or Graph paths from a browser.
    if (!/^[a-zA-Z0-9_/-]+$/.test(path) || path.includes('..')) throw new Error('Invalid Graph path.');
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    if (token) url.searchParams.set('appsecret_proof', createHmac('sha256', config.appSecret).update(token).digest('hex'));
    let response: Response;
    try {
      response = await transport(url, { method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(18000),
        headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new MetaError(0, null); }
    let data: any;
    try { data = await response.json(); } catch { throw new MetaError(response.status, null); }
    if (!response.ok || data.error) throw new MetaError(response.status, typeof data.error?.code === 'number' ? data.error.code : null);
    return data;
  };
  return {
    request,
    exchange: (code: string) => request('oauth/access_token', '', undefined, { client_id: config.appId, client_secret: config.appSecret, code }),
    debug: (token: string) => request('debug_token', config.appId + '|' + config.appSecret, undefined, { input_token: token }),
  };
}

export function validateToken(debug: any, appId: string) {
  const data = debug?.data;
  if (!data?.is_valid || String(data.app_id) !== appId ||
    (data.expires_at && data.expires_at * 1000 <= Date.now()) ||
    (data.data_access_expires_at && data.data_access_expires_at * 1000 <= Date.now()) ||
    !['whatsapp_business_management', 'whatsapp_business_messaging'].every(scope => data.scopes?.includes(scope))) {
    throw new Error('Meta no autorizó los permisos necesarios. Vuelve a conectar WhatsApp.');
  }
}

export type MessagePreview = { id: string; peer: string; direction: 'in' | 'out'; timestamp: string; text: string };
export function extractMessages(value: any, phone: string): MessagePreview[] {
  const previews: MessagePreview[] = [];
  const push = (message: any, peer?: string, outbound = false) => {
    if (typeof message?.id !== 'string') return;
    const time = Number(message.timestamp) * 1000;
    if (!Number.isFinite(time) || time < 0 || time > 8640000000000000) return;
    previews.push({ id: message.id.slice(0, 300), peer: String(peer || message.from || message.from_user_id || 'Contacto').slice(0, 100), direction: outbound ? 'out' : 'in',
      timestamp: new Date(time).toISOString(), text: String(message.text?.body || message.caption || message[message.type]?.caption || '[' + String(message.type || 'mensaje') + ']').slice(0, 4096) });
  };
  for (const m of Array.isArray(value?.messages) ? value.messages : []) push(m);
  for (const m of Array.isArray(value?.message_echoes) ? value.message_echoes : []) push(m, m.to || m.to_user_id, true);
  for (const history of Array.isArray(value?.history) ? value.history : []) {
    for (const thread of Array.isArray(history.threads) ? history.threads : []) {
      for (const m of Array.isArray(thread.messages) ? thread.messages : []) {
        const outbound = String(m.from || '').replace(/\D/g, '') === phone.replace(/\D/g, '') || Boolean(m.to || m.to_user_id);
        push(m, thread.id || thread.context?.wa_id || thread.context?.user_id, outbound);
      }
    }
  }
  return previews;
}

export function chooseCoexistencePhone(phones: unknown, phoneId?: string) {
  const eligible = (Array.isArray(phones) ? phones : []).filter(p => p?.is_on_biz_app === true && p.platform_type === 'CLOUD_API');
  const phone = phoneId ? eligible.find(p => p.id === phoneId) : eligible.length === 1 ? eligible[0] : null;
  if (!phone || !metaId(phone.id)) throw new Error('Selecciona un número conectado con WhatsApp Business mediante coexistencia.');
  return phone;
}

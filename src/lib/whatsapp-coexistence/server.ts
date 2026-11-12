import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { chooseCoexistencePhone, digest, graphClient, MetaError, metaId, noticePayload, noticeTemplates, seal, templateDefinition, unseal, validateToken, type Notice, type NoticeKind } from './core';

export type Connection = {
  organization_id: string; waba_id: string; phone_id: string; display_phone: string;
  verified_name: string; token_ciphertext: string; token_expires_at: string | null;
  status: 'setting_up' | 'syncing' | 'pending_templates' | 'active' | 'reconnect_required' | 'paused';
  details: Record<string, any>; updated_at: string;
};
export function configuration() {
  const env = process.env;
  return { appId: env.META_APP_ID || '', appSecret: env.META_APP_SECRET || '', configId: env.META_EMBEDDED_SIGNUP_CONFIG_ID || '',
    version: env.WHATSAPP_GRAPH_API_VERSION || 'v27.0', encryptionKey: env.WHATSAPP_CONNECTION_ENCRYPTION_KEY || '',
    verifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '', callback: env.WHATSAPP_COEXISTENCE_CALLBACK_URL || '',
    mode: env.WHATSAPP_COEXISTENCE_MODE || 'off', webhooksReady: env.WHATSAPP_COEXISTENCE_WEBHOOKS_READY === 'true' };
}
export function enabledFor(organizationId: string): boolean {
  const { mode } = configuration();
  return mode === 'live' || (mode === 'pilot' && (process.env.WHATSAPP_COEXISTENCE_PILOT_ORGS || '').split(',').map(id => id.trim()).includes(organizationId));
}
export function setupReady(): boolean {
  const c = configuration();
  let url: URL;
  try { url = new URL(c.callback); } catch { return false; }
  return metaId(c.appId) && metaId(c.configId) && c.appSecret.length >= 20 && Buffer.from(c.encryptionKey, 'base64').length === 32 &&
    c.verifyToken.length >= 32 && url.protocol === 'https:' && url.pathname === '/api/whatsapp/webhook' && !url.search && !url.username && c.webhooksReady;
}
export async function serviceRpc<T = any>(action: string, data: object = {}): Promise<T> {
  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc('whatsapp_service', { p_action: action, p_data: data });
  if (error) throw new Error('No se pudo guardar o consultar la conexión de WhatsApp.');
  return result as T;
}
export const getConnection = (org: string) => serviceRpc<Connection | null>('get', { org });
export async function hasWorkshopWhatsApp(org: string): Promise<boolean> {
  try { return Boolean(await getConnection(org)); } catch { return false; }
}
export const patchConnection = (org: string, patch: object) => serviceRpc('patch', { org, patch });
const tokenExpired = (connection: Connection) => Boolean(connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now());
export function publicConnection(connection: Connection | null) {
  if (!connection) return null;
  return { number: connection.display_phone, name: connection.verified_name, status: tokenExpired(connection) && connection.status !== 'paused' ? 'reconnect_required' : connection.status,
    templates: connection.details.templates || {}, history: connection.details.history || 'pending',
    progress: connection.details.progress || 0, issue: connection.details.issue || null, updatedAt: connection.updated_at };
}
export function encryptedToken(connection: Connection) {
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now()) throw new Error('Vuelve a conectar WhatsApp para renovar el acceso.');
  return unseal(connection.token_ciphertext, connection.organization_id, configuration().encryptionKey);
}
export async function beginConnection(org: string, userId: string) {
  if (!enabledFor(org) || !setupReady()) throw new Error('La conexión de números propios todavía no está habilitada para este taller.');
  const state = randomBytes(32).toString('base64url');
  await serviceRpc('begin', { org, actor: userId, hash: digest(state) });
  return state;
}
export async function completeConnection(org: string, userId: string, input: { state: string; code: string; wabaId: string; phoneId?: string }) {
  if (!enabledFor(org) || !setupReady()) throw new Error('La conexión de números propios todavía no está habilitada.');
  if (!await serviceRpc('claim', { org, actor: userId, hash: digest(input.state) })) throw new Error('La conexión venció o ya se utilizó. Empieza de nuevo.');
  const c = configuration(), graph = graphClient(c);
  const exchange = await graph.exchange(input.code);
  if (typeof exchange.access_token !== 'string') throw new Error('Meta no entregó autorización para esta conexión.');
  const token = exchange.access_token;
  const debug = await graph.debug(token);
  validateToken(debug, c.appId);
  // The browser's asset IDs are hints only. Validate WABA membership and coexistence on Graph.
  const phones = await graph.request(input.wabaId + '/phone_numbers', token, undefined,
    { fields: 'id,display_phone_number,verified_name,is_on_biz_app,platform_type', limit: '100' });
  const phone = chooseCoexistencePhone(phones.data, input.phoneId);
  if (input.wabaId === process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || phone.id === process.env.WHATSAPP_PHONE_NUMBER_ID)
    throw new Error('El número central de MotoManager se administra por separado. Usa el número propio del taller.');
  await serviceRpc('save', { org, actor: userId, waba: input.wabaId, phone: phone.id,
    number: String(phone.display_phone_number || ''), name: String(phone.verified_name || ''),
    token: seal(token, org, c.encryptionKey), expires: debug.data.expires_at ? new Date(debug.data.expires_at * 1000).toISOString() : null });
  try {
    // Never replace the app-level callback: the same Mivra app serves other projects.
    const subscribed = await graph.request(input.wabaId + '/subscribed_apps', token,
      { override_callback_uri: c.callback, verify_token: c.verifyToken });
    if (subscribed.success !== true) throw new Error('Meta no confirmó la suscripción.');
    await patchConnection(org, { details: { subscribed: true } });
    for (const syncType of ['smb_app_state_sync', 'history']) {
      // A journal prevents replay of the one-shot synchronization requests after an ambiguous timeout.
      await patchConnection(org, { details: { [syncType + 'Request']: 'started' } });
      const sync = await graph.request(phone.id + '/smb_app_data', token, { messaging_product: 'whatsapp', sync_type: syncType });
      if (typeof sync.request_id !== 'string') throw new Error('Meta no confirmó la sincronización.');
      await patchConnection(org, { details: { [syncType + 'Request']: sync.request_id } });
    }
  } catch (error) {
    await patchConnection(org, { status: 'reconnect_required', details: { issue: error instanceof MetaError && error.code === 190 ? 'authorization' : 'onboarding' } });
    throw new Error('No se completó la conexión. Revisa los permisos de Meta y vuelve a conectar WhatsApp.');
  }
  // Template review can be resumed without replaying one-shot contact/history synchronization.
  await refreshConnection(org, true).catch(() => patchConnection(org, { details: { issue: 'templates' } }));
  return publicConnection(await getConnection(org));
}

export async function refreshConnection(org: string, provision = false) {
  const connection = await getConnection(org);
  if (!connection || ['paused', 'reconnect_required'].includes(connection.status)) return publicConnection(connection);
  if (tokenExpired(connection)) {
    await patchConnection(org, { status: 'reconnect_required', details: { issue: 'authorization' } });
    return publicConnection(await getConnection(org));
  }
  const graph = graphClient(configuration()), token = encryptedToken(connection);
  const response = await graph.request(connection.waba_id + '/message_templates', token, undefined, { fields: 'name,status,language,components,category', limit: '100' });
  const statuses: Record<string, string> = {};
  for (const kind of Object.keys(noticeTemplates) as NoticeKind[]) {
    const definition = templateDefinition(kind);
    const existing = (response.data || []).find((item: any) => item.name === definition.name && item.language === 'es_CO');
    if (existing) {
      // Approved names alone are insufficient: the parameter layout and text must match our versioned definition.
      const body = existing.components?.find((item: any) => item.type === 'BODY');
      const extra = existing.components?.length !== 1;
      statuses[kind] = body?.text === definition.components[0].text && !extra && existing.category === definition.category ? existing.status : 'INCOMPATIBLE';
    } else if (provision) {
      const created = await graph.request(connection.waba_id + '/message_templates', token, definition);
      statuses[kind] = typeof created.status === 'string' ? created.status : 'PENDING';
    } else statuses[kind] = 'MISSING';
  }
  await patchConnection(org, { details: { templates: statuses, templatesCheckedAt: new Date().toISOString(), issue: null } });
  return publicConnection(await getConnection(org));
}

export async function sendWorkshopNotice(org: string | undefined, phone: string, notice: Notice): Promise<{ success: boolean; provider?: string; data?: any; error?: string } | null> {
  if (!org) return null;
  let connection: Connection | null;
  try { connection = await getConnection(org); } catch { return { success: false, error: 'No se pudo comprobar el número del taller. No se envió el mensaje.' }; }
  if (!connection) return null; // The existing platform sender remains unchanged for workshops without a connection.
  if (enabledFor(org) && setupReady() && !['paused', 'reconnect_required'].includes(connection.status) &&
      (connection.status === 'pending_templates' || connection.details.templates?.[notice.kind] !== 'APPROVED') &&
      Date.now() - (Date.parse(connection.details.templatesCheckedAt || '') || 0) > 60000) {
    try { await refreshConnection(org, true); connection = await getConnection(org); }
    catch { return { success: false, error: 'No se pudo comprobar la aprobación de los mensajes del taller.' }; }
    if (!connection) return { success: false, error: 'La conexión del taller no está disponible.' };
  }
  if (!enabledFor(org) || !setupReady() || connection.status !== 'active' || connection.details.templates?.[notice.kind] !== 'APPROVED')
    return { success: false, error: 'El WhatsApp del taller todavía no está listo. Revisa la conexión y las plantillas.' };
  try {
    if (tokenExpired(connection)) {
      await patchConnection(org, { status: 'reconnect_required', details: { issue: 'authorization' } });
      return { success: false, error: 'Vuelve a conectar WhatsApp para renovar el acceso.' };
    }
    const token = encryptedToken(connection);
    const response = await graphClient(configuration()).request(connection.phone_id + '/messages', token, noticePayload(phone, notice));
    if (!response.messages?.[0]?.id) return { success: false, error: 'Meta no confirmó el envío.' };
    const message = { id: response.messages[0].id, peer: noticePayload(phone, notice).to, direction: 'out', timestamp: new Date().toISOString(),
      text: noticeTemplates[notice.kind].body.replace(/\{\{(\d+)\}\}/g, (_, index) => String(notice.values[Number(index) - 1] || 'No especificado')) };
    // Delivery success must not be retried if recording the local copy fails.
    await serviceRpc('ingest', { org, phone: connection.phone_id, hash: digest('sent:' + message.id), field: 'outbound',
      payload: seal(JSON.stringify(message), org, configuration().encryptionKey),
      messages: [{ id: message.id, timestamp: message.timestamp, payload: seal(JSON.stringify(message), org, configuration().encryptionKey) }] }).catch(() => {});
    return { success: true, provider: 'meta-workshop', data: { messages: response.messages } };
  } catch (error) {
    if (error instanceof MetaError && (error.code === 190 || error.code === 10 || error.code === 200))
      await patchConnection(org, { status: 'reconnect_required', details: { issue: 'authorization' } }).catch(() => {});
    if (error instanceof MetaError && [132015, 132016].includes(error.code || 0))
      await patchConnection(org, { details: { issue: 'templates', templates: { ...connection.details.templates,
        [notice.kind]: error.code === 132015 ? 'PAUSED' : 'DISABLED' } } }).catch(() => {});
    // No retry or fallback: a timeout can occur after Meta accepted the message.
    return { success: false, error: 'No se pudo confirmar el envío desde el WhatsApp del taller. Revisa la conexión.' };
  }
}

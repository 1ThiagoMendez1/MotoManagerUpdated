// Runs in a separate server-condition process. All HTTP is mocked and any
// unexpected destination fails; no customer account or real WhatsApp is used.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { noticeTemplates, templateDefinition } from '../src/lib/whatsapp-coexistence/core';
const org = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
Object.assign(process.env, { CACHE_ENABLED: 'false', NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.test', SUPABASE_INTERNAL_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key', META_APP_ID: '999999', META_APP_SECRET: 'mock-app-secret-with-sufficient-length',
  META_EMBEDDED_SIGNUP_CONFIG_ID: '888888', WHATSAPP_CONNECTION_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'mock-verify-token-with-sufficient-length', WHATSAPP_GRAPH_API_VERSION: 'v27.0',
  WHATSAPP_COEXISTENCE_CALLBACK_URL: 'https://motomanager.example.test/api/whatsapp/webhook', WHATSAPP_COEXISTENCE_MODE: 'pilot',
  WHATSAPP_COEXISTENCE_PILOT_ORGS: org, WHATSAPP_COEXISTENCE_WEBHOOKS_READY: 'true', WHATSAPP_BUSINESS_ACCOUNT_ID: '777777', WHATSAPP_PHONE_NUMBER_ID: '666666' });
let connection: any = null, claimed = false, wrongApp = false, deniedSend = false, persistFailure = false;
const ingested: any[] = [];
const graphCalls: { path: string; body: any }[] = [];
globalThis.fetch = async (input: any, options: any = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url || input.toString());
  const body = options.body ? JSON.parse(options.body) : null;
  if (url.hostname === 'supabase.example.test' && url.pathname.endsWith('/rpc/whatsapp_service')) {
    const d = body.p_data;
    switch (body.p_action) {
      case 'claim': { const result = !claimed; claimed = true; return Response.json(result); }
      case 'get': return Response.json(d.org === org ? connection : null);
      case 'find': return Response.json(d.waba === connection?.waba_id ? connection : null);
      case 'save': connection = { organization_id: org, waba_id: d.waba, phone_id: d.phone, display_phone: d.number, verified_name: d.name,
        token_ciphertext: d.token, token_expires_at: d.expires, status: 'setting_up', details: {} }; return Response.json(true);
      case 'patch': connection.details = { ...connection.details, ...d.patch.details }; connection.status = d.patch.status || 'syncing'; return Response.json(connection);
      case 'ingest': if (persistFailure) return Response.json({ message: 'mock database unavailable' }, { status: 503 }); ingested.push(d); return Response.json(true);
      default: throw new Error('Unexpected RPC action');
    }
  }
  if (url.hostname !== 'graph.facebook.com') throw new Error('Unexpected network destination');
  const path = url.pathname.replace('/v27.0/', ''); graphCalls.push({ path, body });
  if (path === 'oauth/access_token') return Response.json({ access_token: 'mock-business-token', token_type: 'bearer' });
  if (path === 'debug_token') return Response.json({ data: { is_valid: true, app_id: wrongApp ? '123456' : '999999', expires_at: 0, scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'] } });
  if (path === '555555/phone_numbers') return Response.json({ data: [{ id: '444444', is_on_biz_app: true, platform_type: 'CLOUD_API', display_phone_number: '573000000001', verified_name: 'Taller prueba' }] });
  if (path === '555555/subscribed_apps') return Response.json({ success: true });
  if (path === '444444/smb_app_data') return Response.json({ request_id: 'sync-' + body.sync_type });
  if (path === '555555/message_templates') return Response.json({ data: Object.keys(noticeTemplates).map(kind => {
    const definition = templateDefinition(kind as keyof typeof noticeTemplates); return { ...definition, status: 'APPROVED' };
  }) });
  if (path === '444444/messages') return deniedSend ? Response.json({ error: { code: 190, message: 'mock token revoked' } }, { status: 401 }) : Response.json({ messages: [{ id: 'wamid.mock' }] });
  throw new Error('Unexpected Graph request: ' + path);
};
async function main() {
  const { completeConnection, sendWorkshopNotice } = await import('../src/lib/whatsapp-coexistence/server');
  const input = { state: 's'.repeat(43), code: 'mock-exchange-code', wabaId: '555555', phoneId: '444444' };
  await completeConnection(org, actor, input);
  assert.equal(connection.phone_id, '444444');
  assert.ok(!connection.token_ciphertext.includes('mock-business-token'));
  assert.deepEqual(graphCalls.filter(c => c.path.endsWith('smb_app_data')).map(c => c.body.sync_type), ['smb_app_state_sync', 'history']);
  assert.deepEqual(graphCalls.find(c => c.path.endsWith('subscribed_apps'))?.body, { override_callback_uri: process.env.WHATSAPP_COEXISTENCE_CALLBACK_URL, verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN });
  assert.ok(!graphCalls.some(c => c.path.endsWith('/register') || c.path.endsWith('/deregister') || c.path.includes('/subscriptions')));
  await assert.rejects(() => completeConnection(org, actor, input), /ya se utilizó/);
  const notice = { kind: 'appointment' as const, values: ['Ana', 'Taller', 'Mañana a las 9'] };
  assert.equal((await sendWorkshopNotice(org, '3000000002', notice))?.success, false);
  connection.status = 'active';
  const accepted = await sendWorkshopNotice(org, '3000000002', notice);
  assert.equal(accepted?.provider, 'meta-workshop');
  assert.equal(graphCalls.filter(c => c.path.endsWith('/messages')).length, 1);
  connection.token_expires_at = '2000-01-01T00:00:00Z';
  assert.equal((await sendWorkshopNotice(org, '3000000002', notice))?.success, false);
  assert.equal(connection.status, 'reconnect_required');
  connection.token_expires_at = null; connection.status = 'active';
  deniedSend = true;
  assert.equal((await sendWorkshopNotice(org, '3000000002', notice))?.success, false);
  assert.equal(connection.status, 'reconnect_required');
  assert.equal(graphCalls.filter(c => c.path.endsWith('/messages')).length, 2);
  assert.equal((await sendWorkshopNotice(org, '3000000002', notice))?.success, false);
  assert.equal(graphCalls.filter(c => c.path.endsWith('/messages')).length, 2);
  claimed = false; wrongApp = true; const before = graphCalls.length;
  await assert.rejects(() => completeConnection(org, actor, input), /permisos necesarios/);
  assert.deepEqual(graphCalls.slice(before).map(c => c.path), ['oauth/access_token', 'debug_token']);
  const { persistWebhook } = await import('../src/lib/whatsapp-coexistence/webhook');
  const body = (phone = '444444', waba = '555555') => ({ object: 'whatsapp_business_account', entry: [{ id: waba, changes: [{ field: 'messages', value: { metadata: { phone_number_id: phone }, messages: [{ id: 'wamid.incoming', from: '573000000002', timestamp: '1763000000', type: 'text', text: { body: 'Hola' } }] } }] }] });
  const previous = ingested.length;
  await persistWebhook(body('444445')); await persistWebhook(body('444444', '555556'));
  assert.equal(ingested.length, previous);
  await persistWebhook(body());
  assert.equal(ingested.at(-1).org, org); assert.ok(!ingested.at(-1).payload.includes('Hola'));
  persistFailure = true;
  await assert.rejects(() => persistWebhook(body()), /No se pudo guardar/);
  persistFailure = false;
  await persistWebhook({ object: 'whatsapp_business_account', entry: [{ id: '555555', changes: [{ field: 'account_update', value: { event: 'ACCOUNT_OFFBOARDED' } }] }] });
  assert.equal(ingested.at(-1).disconnected, true);
  console.log('COEXISTENCE_SERVER_PROTOCOL_OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDatabaseMutation } from '../src/lib/supabase/transport';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { chooseCoexistencePhone, extractMessages, graphClient, MetaError, noticePayload, recipientNumber, seal, templateDefinition, unseal, validSignature, validateToken } from '../src/lib/whatsapp-coexistence/core';

test('encrypted credentials are bound to a workshop and reject tampering or a wrong key', () => {
  const key = randomBytes(32).toString('base64');
  const ciphertext = seal('private business token', 'workshop-a', key);
  assert.equal(unseal(ciphertext, 'workshop-a', key), 'private business token');
  assert.ok(!ciphertext.includes('private business token'));
  assert.notEqual(ciphertext, seal('private business token', 'workshop-a', key));
  assert.throws(() => unseal(ciphertext, 'workshop-b', key));
  assert.throws(() => unseal(ciphertext, 'workshop-a', randomBytes(32).toString('base64')));
  const parts = ciphertext.split('.'); parts[2] = Buffer.alloc(16).toString('base64url');
  assert.throws(() => unseal(parts.join('.'), 'workshop-a', key));
  assert.throws(() => seal('token', 'workshop-a', 'short'));
});

test('only exact raw-body HMAC signatures authenticate webhooks', () => {
  const body = '{"entry":[]}', secret = 'app-secret-fixture';
  const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(body + ' ', signature, secret), false);
  assert.equal(validSignature(body, signature, 'other'), false);
  for (const invalid of [null, '', 'sha256=abc', signature.toUpperCase()]) assert.equal(validSignature(body, invalid, secret), false);
});

test('asset selection accepts only verified Cloud API coexistence phones and never guesses between numbers', () => {
  const mobile = { id: '111111', is_on_biz_app: true, platform_type: 'CLOUD_API' };
  const other = { id: '222222', is_on_biz_app: true, platform_type: 'CLOUD_API' };
  const normal = { id: '333333', is_on_biz_app: false, platform_type: 'CLOUD_API' };
  assert.equal(chooseCoexistencePhone([mobile, normal]).id, mobile.id);
  assert.equal(chooseCoexistencePhone([mobile, other], other.id).id, other.id);
  for (const args of [[[], undefined], [[normal], normal.id], [[mobile, other], undefined], [[mobile], '444444']] as const)
    assert.throws(() => chooseCoexistencePhone(args[0], args[1]));
  const valid = { data: { is_valid: true, app_id: '999999', expires_at: 0, scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'] } };
  validateToken(valid, '999999');
  assert.throws(() => validateToken(valid, '888888'));
  assert.throws(() => validateToken({ data: { ...valid.data, scopes: ['whatsapp_business_management'] } }, '999999'));
  assert.throws(() => validateToken({ data: { ...valid.data, expires_at: 1 } }, '999999'));
  assert.throws(() => validateToken({ data: { ...valid.data, is_valid: false } }, '999999'));
});

test('Graph calls keep tokens in authorization headers and expose only sanitized failures, with no implicit retry', async () => {
  const requests: { url: URL; options: RequestInit }[] = [];
  const transport = async (url: any, options: any) => {
    requests.push({ url: new URL(url), options });
    return Response.json({ error: { code: 190, message: 'SECRET_TOKEN_IN_PROVIDER_DIAGNOSTICS' } }, { status: 401 });
  };
  const client = graphClient({ appId: '999999', appSecret: 'private-app-secret', version: 'v27.0' }, transport as typeof fetch);
  await assert.rejects(() => client.request('111111/messages', 'private-token', { text: 'fixture' }), error => {
    assert.ok(error instanceof MetaError); assert.equal(error.code, 190); assert.equal(error.status, 401);
    assert.ok(!error.message.includes('SECRET')); assert.ok(!error.message.includes('private-token')); return true;
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.searchParams.has('access_token'), false);
  assert.ok(requests[0].url.searchParams.has('appsecret_proof'));
  assert.equal((requests[0].options.headers as Record<string,string>).Authorization, 'Bearer private-token');
  assert.equal(requests[0].options.cache, 'no-store');
  await assert.rejects(() => client.request('../other', 'private-token'));
  assert.equal(requests.length, 1);
  const unavailable = graphClient({ appId: '999999', appSecret: 'secret', version: 'v27.0' }, (async () => { throw new Error('URL_WITH_SECRET'); }) as typeof fetch);
  await assert.rejects(() => unavailable.request('111111/messages', 'token', {}), e => e instanceof MetaError && !e.message.includes('SECRET'));
});

test('customer templates preserve parameter counts, phone normalization and marketing classification for reminders', () => {
  assert.equal(recipientNumber('323 266 3710'), '573232663710');
  assert.equal(recipientNumber('+57 3232663710'), '573232663710');
  assert.throws(() => recipientNumber('123'));
  const payload = noticePayload('3232663710', { kind: 'order', values: ['Ana\n María', 'Mi taller', '150', 'Reparado', 'AKT'] });
  assert.equal(payload.to, '573232663710'); assert.equal(payload.template.components[0].parameters[0].text, 'Ana María');
  assert.equal(payload.template.name, templateDefinition('order').name);
  assert.equal(templateDefinition('order').category, 'UTILITY');
  assert.equal(templateDefinition('reminder').category, 'MARKETING');
  assert.throws(() => noticePayload('3232663710', { kind: 'quote', values: ['Ana'] }));
});

test('history, new inbound messages, mobile echoes and users without phone numbers produce tenant-local previews', () => {
  const messages = extractMessages({ messages: [{ id: 'in', from_user_id: 'bsuid-customer', timestamp: '1763000000', type: 'text', text: { body: 'Hola' } }],
    message_echoes: [{ id: 'out', to_user_id: 'bsuid-customer', timestamp: '1763000001', type: 'text', text: { body: 'Listo' } }],
    history: [{ threads: [{ context: { user_id: 'bsuid-customer' }, messages: [
      { id: 'old-out', from: '573232663710', timestamp: '1762990000', type: 'image', image: { caption: 'Evidencia' } },
      { id: 'old-in', from_user_id: 'bsuid-customer', timestamp: '1762990001', type: 'text', text: { body: 'Gracias' } },
      { id: 'invalid-date', timestamp: 'no-date', type: 'text' },
    ] }] }] }, '+57 3232663710');
  assert.equal(messages.length, 4);
  assert.deepEqual(messages.map(m => m.direction), ['in', 'out', 'out', 'in']);
  assert.ok(messages.every(m => m.peer === 'bsuid-customer'));
  assert.equal(messages[2].text, 'Evidencia');
});

test('connection protocol validates authorization, skips registration, uses the own sender, authenticates webhooks and ACKs after persistence', () => {
  const result = spawnSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', fileURLToPath(new URL('./whatsapp-coexistence-server-fixture.ts', import.meta.url))], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /COEXISTENCE_SERVER_PROTOCOL_OK/);
  assert.equal(isDatabaseMutation('https://api.example.test/rest/v1/rpc/whatsapp_service', 'POST'), false);
});

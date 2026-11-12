import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, createHash, createHmac } from 'node:crypto';
import { MAX_WHATSAPP_WEBHOOK_BYTES, receiveWhatsAppWebhook, verifyWhatsAppWebhook, type WebhookReceipt } from '../src/lib/whatsapp-webhook';

const token = 'fixture-verification-token-32-characters';
const config = { appId: '1304241294974266', appSecret: 'fixture-secret-only-for-tests', encryptionKey: Buffer.alloc(32, 7).toString('base64') };
const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '123456', changes: [{ field: 'messages', value: { messages: [{ id: 'wamid.fixture', text: { body: 'Mensaje ágil de prueba' } }] } }] }] });
const signed = (body = payload) => new Request('https://example.test/api/whatsapp/webhook', { method: 'POST', body,
  headers: { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', config.appSecret).update(body).digest('hex') } });

test('Meta challenge is echoed verbatim only with the correct verification token', async () => {
  const url = 'https://example.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=0012345&hub.verify_token=';
  const valid = verifyWhatsAppWebhook(new Request(url + token), token);
  assert.equal(valid.status, 200); assert.equal(await valid.text(), '0012345');
  assert.equal(valid.headers.get('cache-control'), 'no-store');
  for (const suffix of ['wrong', token + '&hub.verify_token=other', token + '&hub.challenge=evil'])
    assert.equal(verifyWhatsAppWebhook(new Request(url + suffix), token).status, 403);
  assert.equal(verifyWhatsAppWebhook(new Request(url + token), '').status, 403);
  assert.equal(verifyWhatsAppWebhook(new Request('https://example.test/'), token).status, 403);
});

test('missing app configuration, forged signatures and modified bytes never persist an event', async () => {
  const never = async () => { assert.fail('Untrusted event reached persistence'); };
  assert.equal((await receiveWhatsAppWebhook(signed(), {}, never)).status, 503);
  const missing = new Request('https://example.test/', { method: 'POST', body: payload });
  assert.equal((await receiveWhatsAppWebhook(missing, config, never)).status, 403);
  const modified = new Request(signed(), { body: payload + ' ' });
  assert.equal((await receiveWhatsAppWebhook(modified, config, never)).status, 403);
  assert.equal((await receiveWhatsAppWebhook(signed('null'), config, never)).status, 400);
  assert.equal((await receiveWhatsAppWebhook(signed('{bad'), config, never)).status, 400);
});

test('a signed event is encrypted, bound to its app and hash, and persisted before ACK', async () => {
  let receipt: WebhookReceipt | undefined;
  const result = await receiveWhatsAppWebhook(signed(), config, async r => { receipt = r; });
  assert.equal(result.status, 200); assert.equal(await result.text(), 'EVENT_RECEIVED');
  assert.ok(receipt); assert.equal(receipt.bytes, Buffer.byteLength(payload));
  assert.equal(receipt.digest, createHash('sha256').update(payload).digest('hex'));
  assert.ok(!receipt.ciphertext.includes('Mensaje'));
  const [version, iv, tag, ciphertext] = receipt.ciphertext.split('.'); assert.equal(version, 'v1');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.encryptionKey, 'base64'), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(`motomanager:whatsapp-webhook:v1:${receipt.appId}:${receipt.digest}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  assert.equal(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString(), payload);
  assert.equal((await receiveWhatsAppWebhook(signed(), config, async () => { throw Error('storage offline'); })).status, 503);
});

test('oversized events are bounded even without Content-Length; invalid envelopes are rejected', async () => {
  const never = async () => { assert.fail('Invalid event persisted'); };
  assert.equal((await receiveWhatsAppWebhook(signed('x'.repeat(MAX_WHATSAPP_WEBHOOK_BYTES + 1)), config, never)).status, 413);
  assert.equal((await receiveWhatsAppWebhook(signed(JSON.stringify({ object: 'whatsapp_business_account', entry: null })), config, never)).status, 400);
  assert.equal((await receiveWhatsAppWebhook(signed(JSON.stringify({ object: 'other' })), config, never)).status, 200);
});

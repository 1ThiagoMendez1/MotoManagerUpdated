import test from 'node:test';
import assert from 'node:assert/strict';
import { newPhoneBrowser, newPhoneCode, phoneAuthHash, phoneAuthOrigin, sendWorkshopPhoneCode } from '../src/lib/workshop-phone-auth';
import { phoneRequestSchema, phoneVerifySchema } from '../src/lib/workshop-phone-shared';
import { validTrialDiagnostic } from '../src/lib/analytics/trial-events';

test('signup needs only a workshop and normalized WhatsApp, with explicit request and no credentials', () => {
  const input = { action: 'request', mode: 'signup', phone: '+57 323 266 3710', workshopName: 'Motos de prueba', terms: true };
  const parsed = phoneRequestSchema.parse(input);
  assert.equal(parsed.phone, '573232663710'); assert.equal(parsed.marketing, false);
  assert.equal(phoneRequestSchema.safeParse({ ...input, terms: false }).success, false);
  assert.equal(phoneRequestSchema.safeParse({ ...input, email: 'nobody@example.test' }).success, false);
  assert.equal(phoneRequestSchema.safeParse({ ...input, phone: 'abc3232663710' }).success, false);
  assert.equal(phoneRequestSchema.safeParse({ ...input, website: 'robot' }).success, false);
  assert.equal(phoneVerifySchema.safeParse({ action: 'verify', challenge: 'invalid', code: '123456' }).success, false);
});
test('codes use cryptographic randomness and a server secret bound to challenge and purpose', () => {
  for (let i = 0; i < 20; i++) assert.match(newPhoneCode(), /^\d{6}$/);
  assert.match(newPhoneBrowser(), /^[\w-]{43}$/);
  const secret = 'unit-test-only-never-a-production-secret';
  assert.notEqual(phoneAuthHash('code', 'challenge:123456', secret), phoneAuthHash('code', 'different:123456', secret));
  assert.notEqual(phoneAuthHash('code', 'challenge:123456', secret), phoneAuthHash('browser', 'challenge:123456', secret));
  assert.throws(() => phoneAuthHash('code', 'anything', 'short'));
  assert.equal(phoneAuthOrigin('https://motomanager.com.co'), true);
  assert.equal(phoneAuthOrigin('https://motomanager.com.co.evil.example'), false);
  assert.equal(phoneAuthOrigin('http://localhost:3000'), false);
});
test('Meta acceptance requires a message id, uses an authentication body/button, and never retries ambiguous sends', async () => {
  const config = { token: 'fixture-only', phoneId: '123456789', template: 'codigo_de_acceso', language: 'es_CO' };
  let calls = 0;
  const fake = (async (url: string, init: RequestInit) => {
    calls++; assert.equal(url, 'https://graph.facebook.com/v27.0/123456789/messages');
    const body = JSON.parse(String(init.body)); assert.equal(body.to, '573232663710');
    assert.equal(body.template.components[1].sub_type, 'url');
    assert.equal(body.template.components[0].parameters[0].text, '123456');
    return Response.json({ messages: [{ id: 'wamid.fixture' }] });
  }) as typeof fetch;
  assert.deepEqual(await sendWorkshopPhoneCode('573232663710', '123456', config, fake), { accepted: true, messageId: 'wamid.fixture' });
  assert.equal(calls, 1);
  assert.deepEqual(await sendWorkshopPhoneCode('573232663710', '123456', config, (async () => { calls++; throw new Error('timeout'); }) as typeof fetch), { accepted: false, ambiguous: true });
  assert.equal(calls, 2);
  assert.deepEqual(await sendWorkshopPhoneCode('573232663710', '123456', config, (async () => Response.json({ error: {} }, { status: 400 })) as typeof fetch), { accepted: false, ambiguous: false });
});
test('analytics accepts phase labels only, never a code, phone, or arbitrary error', () => {
  assert.equal(validTrialDiagnostic({ kind: 'form_step', target: 'field_v2:code:edit' }), true);
  assert.equal(validTrialDiagnostic({ kind: 'form_step', target: 'phone_v1:verified' }), true);
  assert.equal(validTrialDiagnostic({ kind: 'form_step', target: 'phone_v1:123456' }), false);
  assert.equal(validTrialDiagnostic({ kind: 'form_step', target: 'phone_v1:verify', code: '123456' }), false);
});

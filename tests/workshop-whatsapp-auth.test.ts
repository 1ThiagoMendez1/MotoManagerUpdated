import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QR_WHATSAPP_TEMPLATE, QR_WHATSAPP_LANGUAGE, buildQrCodeTemplate,
  phoneAccountEmail, phoneMatchesAccount, qrCodeRequestSchema, qrCodeVerificationSchema,
} from '../src/lib/workshops/whatsapp-auth';

test('OTP QR validates strictly Colombian WhatsApp phones and workshop slugs', () => {
  const request = qrCodeRequestSchema.parse({ slug: 'frankormotos', phone: '+57 300 123 4567' });
  assert.equal(request.phone, '573001234567');
  for (const data of [{ slug: '../admin', phone: '3001234567' },
    { slug: 'frankormotos', phone: '123' }, { slug: 'frankormotos', phone: '+56999999999' }]) {
    assert.equal(qrCodeRequestSchema.safeParse(data).success, false);
  }
  assert.equal(qrCodeVerificationSchema.safeParse({ ...request, code: '123456' }).success, true);
  assert.equal(qrCodeVerificationSchema.safeParse({ ...request, code: '12345' }).success, false);
});

test('OTP Meta authentication template matches es_CO and repeats code on copy button', () => {
  const template = buildQrCodeTemplate('513297');
  assert.equal(template.name, QR_WHATSAPP_TEMPLATE);
  assert.equal(template.name, 'codigo_registro_qr');
  assert.equal(template.language.code, QR_WHATSAPP_LANGUAGE);
  assert.deepEqual(template.components[0].parameters, [{ type: 'text', text: '513297' }]);
  assert.equal(template.components[1].sub_type, 'url');
  assert.deepEqual(template.components[1].parameters, [{ type: 'text', text: '513297' }]);
  assert.throws(() => buildQrCodeTemplate('not a code'));
});

test('internally verified QR accounts cannot register under a different phone', () => {
  assert.equal(phoneAccountEmail('573001234567'), '573001234567@clientes.motomanager.com.co');
  assert.equal(phoneMatchesAccount('573001234567@clientes.motomanager.com.co', '300 123 4567'), true);
  assert.equal(phoneMatchesAccount('573001234567@clientes.motomanager.com.co', '300 123 4568'), false);
  assert.equal(phoneMatchesAccount('ana@personal.test', '+57 300 123 4568'), true);
  assert.throws(() => phoneAccountEmail('invalid'));
});

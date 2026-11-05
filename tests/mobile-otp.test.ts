import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateMobileCode, generateTemporaryPassword, hashMobileCode, normalizeMobilePhone,
} from '../src/lib/mobile-otp';

test('OTP accepts only Colombian mobile numbers normalized for WhatsApp', () => {
  assert.equal(normalizeMobilePhone('300 123 4567'), '573001234567');
  assert.equal(normalizeMobilePhone('+57 300 123 4567'), '573001234567');
  assert.equal(normalizeMobilePhone('123'), null);
  assert.equal(normalizeMobilePhone('57300123456799'), null);
});

test('OTP is six digits from a cryptographic generator', () => {
  for (let i = 0; i < 20; i++) {
    assert.match(generateMobileCode(), /^[0-9]{6}$/);
  }
});

test('HMAC binds the code to the number and a nontrivial server secret', () => {
  const pepper = 'the-test-secret-is-not-for-production-123456789';
  const a = hashMobileCode('573001234567', '123456', pepper);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, hashMobileCode('573001234567', '123456', pepper));
  assert.notEqual(a, hashMobileCode('573001234568', '123456', pepper));
  assert.notEqual(a, hashMobileCode('573001234567', '123457', pepper));
  assert.throws(() => hashMobileCode('573001234567', '123456', 'short'));
});

test('temporary password is not a fixed default credential', () => {
  const a = generateTemporaryPassword();
  const b = generateTemporaryPassword();
  assert.ok(a.length >= 35);
  assert.notEqual(a, b);
  assert.notEqual(a, 'TempPassword123!');
});

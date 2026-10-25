import test from 'node:test';
import assert from 'node:assert/strict';
import { workshopAuthFailure, workshopAuthResponseFailure, workshopCallbackUrl, workshopEmailSchema } from '../src/lib/workshops/email-auth';
import { publicWorkshopImageUrl, workshopImageKind, workshopImagePath } from '../src/lib/workshops/public-image';

const org = '20000000-0000-4000-a000-000000000001';
const other = '20000000-0000-4000-a000-000000000002';
const path = `${org}/30000000-0000-4000-a000-000000000001.png`;

test('public workshop media never resolves another tenant, private avatars or arbitrary URLs', () => {
  assert.equal(publicWorkshopImageUrl({ public_image_path: path, internal_token: 'PRIVATE' }, org, 'https://api.example.test/'),
    `https://api.example.test/storage/v1/object/public/workshop-images/${path}`);
  for (const settings of [null, [], {}, { avatar_path: path }, { public_image_path: path.replace(org, other) },
    { public_image_path: '../profile-avatars/private.png' }, { public_image_path: 'https://evil.test/image.png' },
    { public_image_path: `${org}/../secret.png` }, { public_image_path: path + '?token=PRIVATE' }]) {
    assert.equal(workshopImagePath(settings, org), null);
  }
});

test('workshop media rejects SVG and forged MIME types', () => {
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0]);
  assert.equal(workshopImageKind(png, 'image/png')?.ext, 'png');
  assert.equal(workshopImageKind(png, 'image/jpeg'), null);
  assert.equal(workshopImageKind(new TextEncoder().encode('<svg onload="alert(1)"/>'), 'image/png'), null);
  assert.equal(workshopImageKind(new Uint8Array([255,216,255,0,0]), 'image/jpeg')?.ext, 'jpg');
  assert.equal(workshopImageKind(new TextEncoder().encode('RIFF1234WEBP0'), 'image/webp')?.ext, 'webp');
});

test('email requests normalize addresses and reject malformed workshop slugs', () => {
  assert.equal(workshopEmailSchema.parse({ slug: 'frankormotos', email: ' Ana@Example.test ', mode: 'new' }).email, 'ana@example.test');
  for (const change of [{ slug: '../admin' }, { email: 'invalid' }, { mode: 'owner' }]) {
    assert.equal(workshopEmailSchema.safeParse({ slug: 'frankormotos', email: 'ana@example.test', mode: 'new', ...change }).success, false);
  }
});

test('callback uses the public origin, permits local QA and rejects unsafe schemes', () => {
  assert.equal(workshopCallbackUrl('https://motomanager.com.co', 'frankormotos'),
    'https://motomanager.com.co/auth/callback?next=%2Ftalleres%2Ffrankormotos');
  assert.ok(workshopCallbackUrl('http://127.0.0.1:3001', 'test'));
  for (const origin of [null, 'javascript:alert(1)', 'http://public.example', 'https://user:password@example.test', 'not-a-url'])
    assert.equal(workshopCallbackUrl(origin, 'test'), null);
  assert.equal(workshopCallbackUrl('https://example.test', '../admin'), null);
});

test('email failures distinguish throttling, SMTP and disabled signups without leaking provider data', () => {
  const rate = workshopAuthFailure({ code: 'over_email_send_rate_limit', status: 429 });
  assert.equal(rate.retryAfterSeconds, 60);
  assert.match(rate.error, /límite/);
  for (const code of ['email_address_not_authorized', 'signup_disabled', 'email_provider_disabled', 'otp_disabled']) {
    const result = workshopAuthFailure({ code, status: 400, message: 'SECRET_PROVIDER_DATA' });
    assert.match(result.error, /contraseña/);
    assert.ok(!result.error.includes('SECRET_PROVIDER_DATA'));
  }
  assert.match(workshopAuthFailure({ status: 500, message: 'Error sending confirmation email with SECRET' }).error, /servicio de correo/);
  const providerFailure = workshopAuthResponseFailure(500, { code: 'unexpected_failure', msg: 'Error sending confirmation email with SECRET' });
  assert.match(workshopAuthFailure(providerFailure).error, /servicio de correo/);
  assert.ok(!workshopAuthFailure(providerFailure).error.includes('SECRET'));
  assert.equal(workshopAuthResponseFailure(500, { code: 'personal-data@example.test' }).code, undefined);
  assert.match(workshopAuthFailure({ code: 'invalid_credentials', status: 400 }, 'password').error, /incorrectos/);
  assert.match(workshopAuthFailure({ code: 'email_not_confirmed', status: 400 }, 'password').error, /verifica tu correo/);
});

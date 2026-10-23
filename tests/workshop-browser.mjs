// Integration test against a LOCAL Auth + PostgREST + Mailpit instance only.
// It creates a fictitious account and sends mail solely to the local mailbox.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const mailbox = process.env.TEST_MAILPIT_URL || 'http://127.0.0.1:54326';
const slug = process.env.TEST_WORKSHOP_SLUG || 'moto-centro';
for (const origin of [base, mailbox]) {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'This test must not create accounts or send mail outside localhost');
}
assert.match(slug, /^[a-z0-9-]+$/);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TEST_CHROMIUM_PATH ? { executablePath: process.env.TEST_CHROMIUM_PATH } : {}),
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${base}/talleres/${slug}`);
  assert.equal(response.status(), 200);
  const email = `qr-${Date.now()}@example.test`;
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByRole('button', { name: 'Continuar con mi correo' }).click();
  await page.getByRole('heading', { name: 'Revisa tu correo' }).waitFor();
  let message;
  for (let attempt = 0; attempt < 20; attempt++) {
    const messages = await (await fetch(`${mailbox}/api/v1/messages`)).json();
    message = messages.messages.find(item => item.To.some(recipient => recipient.Address === email));
    if (message) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(message, 'Verification mail was not delivered locally');
  const mail = await (await fetch(`${mailbox}/api/v1/message/${message.ID}`)).json();
  const link = mail.HTML.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
  assert.ok(link);
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(link).hostname));
  await page.goto(link);
  await page.getByRole('heading', { name: 'Un último paso' }).waitFor();
  assert.equal(new URL(page.url()).host, new URL(base).host, 'Callback changed the public host');
  await page.getByLabel('Nombres', { exact: true }).fill('Ana');
  await page.getByLabel('Apellidos', { exact: true }).fill('Pérez');
  await page.getByLabel('Celular de contacto').fill('3001234567');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vincularme a' }).click();
  await page.getByRole('heading', { name: /Ya eres parte de/ }).waitFor();
  await page.goto(`${base}/admin`);
  await page.waitForURL('**/no-workshop');
  assert.deepEqual(errors, []);
  console.log('PASS: mobile storefront, verification email, PKCE, enrollment, customer denied administration');
} finally {
  await browser.close();
}

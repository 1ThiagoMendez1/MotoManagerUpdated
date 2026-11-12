// TRIAL_TEST_BASE_URL must point to the reviewed build. Every non-GET request
// is intercepted locally; this check never creates accounts or sends analytics.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TRIAL_TEST_BASE_URL;
assert.ok(base, 'Set TRIAL_TEST_BASE_URL to the reviewed app build.');
const target = new URL('/prueba-gratis', base);
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const mode of ['typed', 'autofill', 'mixed']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.__trialMilestones = [];
      window.addEventListener('mm:trial-progress', event => window.__trialMilestones.push(event.detail));
    });
    await context.routeWebSocket('**', socket => socket.close());
    const posts = [], analytics = [], errors = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== target.origin) return route.abort();
      if (url.pathname === '/api/analytics/collect') {
        if (request.method() === 'POST') analytics.push(request.postDataJSON());
        return route.fulfill({ status: 204 });
      }
      if (!['GET', 'HEAD'].includes(request.method())) {
        if (url.pathname === target.pathname && request.headers()['next-action']) posts.push(request.postData() || '');
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(target.href, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Continuar con mi acceso', exact: true }).waitFor();
    const enter = async (values) => {
      if (mode !== 'autofill') {
        for (const [field, value] of Object.entries(values)) await page.locator('#trial-' + field).fill(value);
      } else {
        // Some autofill/password-manager paths set DOM values without React events.
        await page.evaluate(data => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          for (const [field, value] of Object.entries(data)) setter.call(document.querySelector('#trial-' + field), value);
        }, values);
      }
    };
    await page.getByRole('button', { name: 'Continuar con mi acceso', exact: true }).click();
    await page.locator('#trial-workshopName-error').waitFor();
    assert.equal(posts.length, 0);
    if (mode === 'mixed') {
      await page.locator('#trial-fullName').evaluate(input => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Ana Prueba'); });
      await enter({ workshopName: 'Taller de prueba' });
      assert.equal(await page.locator('#trial-fullName').inputValue(), 'Ana Prueba');
    } else await enter({ workshopName: 'Taller de prueba', fullName: 'Ana Prueba' });
    await page.getByRole('button', { name: 'Continuar con mi acceso', exact: true }).click();
    await page.locator('#trial-phone').waitFor();
    assert.equal(await page.locator('#trial-marketing').isChecked(), false, 'Promotions must be optional and unchecked');
    assert.equal(await page.locator('input[name="marketingRequested"]').inputValue(), 'no');
    assert.equal(await page.locator('#trial-phone-purpose').isVisible(), true);
    assert.equal(await page.locator('input[name="workshopName"]').inputValue(), 'Taller de prueba');
    assert.equal(posts.length, 0);
    if (mode === 'mixed') {
      await page.evaluate(() => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(document.querySelector('#trial-email'), 'ana@example.test');
        setter.call(document.querySelector('#trial-password'), 'frase de prueba segura');
      });
      await page.locator('#trial-marketing').check();
      assert.equal(await page.locator('#trial-email').inputValue(), 'ana@example.test', 'Changing optional permission must preserve autofill');
      assert.equal(await page.locator('#trial-password').inputValue(), 'frase de prueba segura');
      await enter({ phone: '3000000000' });
      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
      assert.equal(await page.locator('#trial-password').inputValue(), 'frase de prueba segura');
      await page.getByRole('button', { name: 'Corregir datos del taller', exact: true }).click();
      await page.getByRole('button', { name: 'Continuar con mi acceso', exact: true }).click();
      assert.equal(await page.locator('#trial-email').inputValue(), 'ana@example.test');
    } else await enter({ email: 'ana@example.test', password: 'frase de prueba segura', phone: '3000000000' });
    if (mode === 'autofill') {
      await page.locator('#trial-marketing').check();
      await page.locator('#trial-marketing').uncheck();
      assert.equal(await page.locator('#trial-password').inputValue(), 'frase de prueba segura');
    }
    if (mode === 'typed') {
      await page.locator('#trial-phone').fill('12');
      await page.getByRole('button', { name: 'Crear mi taller gratis', exact: true }).click();
      await page.locator('#trial-phone-error').waitFor();
      assert.equal(posts.length, 0, 'Invalid phone must not reach Auth');
      await page.locator('#trial-phone').fill('3000000000');
    }
    assert.equal(await page.locator('input[name="marketingRequested"]').inputValue(), mode === 'mixed' ? 'yes' : 'no');
    await page.getByRole('button', { name: 'Crear mi taller gratis', exact: true }).click();
    await page.getByText('No recibimos respuesta.', { exact: false }).waitFor();
    assert.equal(posts.length, 1, mode + ': valid fields must reach exactly one server action');
    assert.equal(await page.locator('#trial-email').inputValue(), 'ana@example.test');
    assert.equal(await page.locator('#trial-password').inputValue(), 'frase de prueba segura');
    assert.equal(await page.locator('#trial-marketing').isChecked(), mode === 'mixed', 'A failed request must preserve the optional choice');
    assert.equal(await page.locator('input[name="marketingRequested"]').inputValue(), mode === 'mixed' ? 'yes' : 'no');
    const measured = JSON.stringify(analytics);
    if (mode === 'autofill') assert.ok(!analytics.flatMap(batch => batch.events).some(event => event.kind === 'form_start'), 'Choosing an optional checkbox is not writing a signup field');
    const milestones = await page.evaluate(() => window.__trialMilestones);
    assert.ok(milestones.some(event => event.target === 'field_v1:phone:view'), 'Viewing WhatsApp must be measured separately');
    assert.ok(milestones.some(event => event.target === 'field_v1:phone:valid'));
    if (mode === 'typed') assert.ok(milestones.some(event => event.target === 'field_v1:phone:invalid'));
    if (mode !== 'autofill') assert.ok(milestones.some(event => event.target === 'field_v1:phone:edit'));
    for (const value of ['Taller de prueba', 'Ana Prueba', 'ana@example.test', '3000000000', 'frase de prueba segura']) {
      assert.ok(!measured.includes(value), 'Form values must stay out of analytics.');
      assert.ok(!JSON.stringify(milestones).includes(value), 'Milestones must contain labels only');
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log('TRIAL_SIGNUP_' + mode.toUpperCase() + '_PASSED');
  }
} finally { await browser.close(); }

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Optional integration test: run against a disposable LOCAL Auth/PostgREST stack.
// Credentials must belong to a fixture owner, never a customer or production user.
const base = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3007');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only a local test application is allowed');
const email = process.env.TEST_OWNER_EMAIL;
const password = process.env.TEST_OWNER_PASSWORD;
const slug = process.env.TEST_WORKSHOP_SLUG;
assert.ok(email?.endsWith('@example.test') && password && slug, 'Set fixture TEST_OWNER_EMAIL (@example.test), TEST_OWNER_PASSWORD and TEST_WORKSHOP_SLUG');
const browser = await chromium.launch({
  executablePath: process.env.TEST_CHROMIUM_PATH || undefined,
  headless: true,
});
try {
  // Explicit timezone differs from the server configuration (America/Bogota).
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, timezoneId: 'UTC' });
  const errors = [];
  const paths = [];
  page.on('pageerror', error => errors.push({ path: new URL(page.url()).pathname, message: error.message }));
  page.on('request', request => paths.push(new URL(request.url()).pathname));
  await page.goto(new URL('/login', base).href);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL(url => url.pathname === `/${slug}`, { timeout: 30000 });
  await page.locator('h1').first().waitFor();
  assert.equal(paths.includes('/api/workshop/options'), false, 'Home must not eagerly load order options');
  const homeShell = await page.locator('body').evaluate(element => {
    element.dataset.navigationTest = 'preserved';
    return element.dataset.navigationTest;
  });
  const customersLink = page.locator('a[href="/customers"]').first();
  await customersLink.hover();
  await customersLink.click();
  await page.waitForURL(url => url.pathname === '/customers');
  assert.equal(await page.locator('body').getAttribute('data-navigation-test'), homeShell, 'Client navigation must preserve the document');

  const rounds = [];
  for (let round = 0; round < 2; round++) {
    const times = {};
    for (const path of ['/customers', '/motorcycles', '/inventory', '/work-orders', '/sales', '/services', '/appointments', '/dashboard']) {
      const started = performance.now();
      const response = await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, `${path} HTTP status`);
      assert.equal(new URL(page.url()).pathname, path, `${path} authorization`);
      assert.equal(await page.getByText('No pudimos cargar este apartado', { exact: true }).count(), 0, `${path} error boundary`);
      assert.equal(await page.getByText(/Error al cargar las ventas/).count(), 0, 'Sales query must succeed');
      times[path] = Math.round(performance.now() - started);
    }
    rounds.push(times);
  }
  await page.goto(new URL('/motorcycles', base).href, { waitUntil: 'networkidle' });
  assert.equal(paths.some(path => path.endsWith('/history')), false, 'History must be lazy');
  const historyResponse = page.waitForResponse(response => response.url().includes('/history') && response.status() === 200);
  await page.getByRole('button', { name: 'Ver', exact: true }).first().click();
  assert.ok(Array.isArray((await (await historyResponse).json()).items), 'History response');
  await page.keyboard.press('Escape');
  await page.goto(new URL(`/${slug}`, base).href, { waitUntil: 'networkidle' });
  const optionsResponse = page.waitForResponse(response => response.url().includes('/api/workshop/options') && response.status() === 200);
  await page.getByRole('button', { name: 'Nueva Orden', exact: true }).click();
  const options = await (await optionsResponse).json();
  assert.ok(Array.isArray(options.motorcycles) && Array.isArray(options.technicians));
  await page.keyboard.press('Escape');
  const exported = await page.request.get(new URL('/api/workshop/sales/export', base).href);
  assert.equal(exported.status(), 200);
  assert.ok(Array.isArray((await exported.json()).items));
  const metrics = await page.request.get(new URL('/api/admin/performance', base).href);
  assert.equal(metrics.status(), 403, 'A workshop owner must not access superadmin diagnostics');
  assert.deepEqual(errors, [], 'Navigation must not trigger JavaScript or hydration errors');
  console.log(JSON.stringify({ test: 'local production-mode browser; includes networkidle waiting, not production or SSR latency', rounds }));
} finally {
  await browser.close();
}

// Opt-in integration test against a disposable Docker clone only. Never point
// this at production. Creates synthetic Auth users and modifies only their trial.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

if (process.env.MM_TRIAL_REVIEW_VALIDATION !== '1') throw Error('Set MM_TRIAL_REVIEW_VALIDATION=1 for the isolated Docker fixture');
const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const project = 'mm-trial-review-validation';
const evidenceDir = process.env.MM_TRIAL_REVIEW_EVIDENCE_DIR || '/opt/motomanager-trial-review-20261106';
const inspect = service => {
  const data = JSON.parse(execFileSync('docker', ['inspect', project + '-' + service + '-1'], { encoding: 'utf8' }))[0];
  assert.equal(data.Config.Labels['com.docker.compose.project'], project);
  return data;
};
const network = project + '_private';
const web = 'http://' + inspect('production-web').NetworkSettings.Networks[network].IPAddress + ':3000';
const gateway = 'http://' + inspect('production-gateway').NetworkSettings.Networks[network].IPAddress + ':8000';
const env = Object.fromEntries(inspect('production-web').Config.Env.map(value => { const i = value.indexOf('='); return [value.slice(0, i), value.slice(i + 1)]; }));
const sql = query => execFileSync('docker', ['exec', '-i', project + '-production-db-1', 'psql', '-XqAt', '-U', 'postgres', '-d', 'motomanager', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' }).trim();
const admin = createClient(gateway, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const password = crypto.randomBytes(24).toString('base64url');
const nonce = crypto.randomBytes(6).toString('hex');
const fixtures = {};
for (const role of ['owner','staff','other','admin']) {
  const email = 'trial-review-' + role + '-' + nonce + '@example.test';
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: role === 'admin' ? { is_super_admin: true } : {}, user_metadata: { first_name: 'Validación', last_name: role } });
  assert.ifError(result.error);
  const client = createClient(gateway, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  fixtures[role] = { id: result.data.user.id, email, client, session: login.data.session };
}
const workshopName = 'Taller validación ' + nonce;
const provision = async (actor, name, slug) => {
  const result = await admin.rpc('provision_workshop_account', { p_owner_id: actor.id, p_name: name, p_slug: slug, p_phone: '573' + String(crypto.randomInt(100000000, 999999999)), p_city: 'Bogotá' });
  assert.ifError(result.error);return result.data;
};
const org = await provision(fixtures.owner, workshopName, 'review-' + nonce);
const otherOrg = await provision(fixtures.other, 'Otro taller ' + nonce, 'other-' + nonce);
assert.ifError((await admin.from('organization_members').insert({ organization_id: org, user_id: fixtures.staff.id, role: 'technician', status: 'active' })).error);
assert.ifError((await admin.from('customers').insert([{ organization_id: org, first_name: 'Cliente', last_name: 'Ficticio' }, { organization_id: otherOrg, first_name: 'Otro', last_name: 'Cliente' }])).error);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const contexts = [];
const errors = [];
async function contextFor(actor, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, locale: 'es-CO', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36' });
  contexts.push(context);
  const proxy = async (route, target, host) => {
    const req = route.request();
    const response = await route.fetch({ url: req.url().replace('https://' + host, target), headers: { ...req.headers(), host, 'x-forwarded-proto': 'https', 'x-forwarded-host': host }, maxRedirects: 0 });
    await route.fulfill({ response });
  };
  await context.route('https://motomanager.com.co/**', route => proxy(route, web, 'motomanager.com.co'));
  await context.route('https://api.motomanager.com.co/**', route => proxy(route, gateway, 'api.motomanager.com.co'));
  for (const host of ['www.facebook.com','connect.facebook.net','www.googletagmanager.com','www.google-analytics.com']) await context.route('https://' + host + '/**', route => route.fulfill({ status: 204, body: '' }));
  if (actor) {
    const cookie = 'base64-' + Buffer.from(JSON.stringify(actor.session)).toString('base64url');
    const parts = [];
    if (cookie.length <= 3180) parts.push({ name: 'sb-api-auth-token', value: cookie });
    else for (let i = 0; i < Math.ceil(cookie.length / 3180); i++) parts.push({ name: 'sb-api-auth-token.' + i, value: cookie.slice(i * 3180, (i + 1) * 3180) });
    await context.addCookies(parts.map(item => ({ ...item, domain: 'motomanager.com.co', path: '/', secure: true, sameSite: 'Lax' })));
  }
  const page = await context.newPage();page.on('pageerror', err => errors.push(err.message));
  return { context, page };
}
const report = { isolatedProject: project, checks: [] };
const passed = value => { report.checks.push(value); console.log('TRIAL_REVIEW_CHECK_PASSED', value); };
try {
  const owner = await contextFor(fixtures.owner);
  const manager = await contextFor(fixtures.admin);
  assert.equal((await owner.page.goto('https://motomanager.com.co/dashboard')).status(), 200);
  assert.equal(new URL(owner.page.url()).pathname, '/dashboard');
  await manager.page.goto('https://motomanager.com.co/admin?view=workshops');
  await manager.page.getByPlaceholder('Buscar taller o dominio...').fill(workshopName);
  let row = manager.page.getByRole('row').filter({ hasText: workshopName });
  await row.getByRole('button', { name: 'Pausar prueba', exact: true }).click();
  await manager.page.getByLabel('Motivo de la pausa (solo administración)').fill('Dato de contacto pendiente de comprobar. Nota privada de validación.');
  await manager.page.getByRole('button', { name: 'Pausar prueba y bloquear acceso', exact: true }).click();
  await row.getByText('EN REVISIÓN', { exact: true }).waitFor();
  passed('administrator can pause a trial from workshop management');
  await owner.page.waitForURL('**/revision-prueba', { timeout: 25000 });
  await owner.page.getByRole('heading', { name: 'Prueba gratuita en revisión' }).waitFor();
  assert.ok(!(await owner.page.locator('body').innerText()).includes('Nota privada de validación'));
  passed('an already open session moves to review without revealing private notes');
  for (const role of ['owner','staff']) {
    const result = await fixtures[role].client.from('customers').select('id');
    assert.equal(result.status, 403);assert.equal(result.error.code, 'PT403');
    const review = await fixtures[role].client.rpc('get_my_trial_review');
    assert.ifError(review.error);assert.equal(review.data.organizationId, org);
  }
  assert.ifError((await fixtures.other.client.from('customers').select('id')).error);
  const deniedAdmin = await fixtures.owner.client.rpc('admin_list_trial_reviews');
  assert.ok(deniedAdmin.error);
  const api = await owner.page.evaluate(async () => {
    const response = await fetch('/api/work-orders/test/items', { method: 'POST' });
    return { status: response.status, body: await response.json() };
  });
  assert.equal(api.status,403);assert.equal(api.body.code,'TRIAL_UNDER_REVIEW');
  passed('old owner/staff tokens and direct API requests are denied; another workshop remains active');
  const staff = await contextFor(fixtures.staff, true);
  await staff.page.goto('https://motomanager.com.co/dashboard');
  assert.equal(new URL(staff.page.url()).pathname, '/revision-prueba');
  assert.equal(await staff.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);
  await staff.page.screenshot({ path: path.join(evidenceDir, 'review-mobile.png'), fullPage: true });
  await staff.page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await staff.page.waitForURL('**/login');
  passed('review page fits mobile and allows secure logout');
  const newLogin = await contextFor(null);
  await newLogin.page.goto('https://motomanager.com.co/login');
  await newLogin.page.locator('input[type=email]').fill(fixtures.owner.email);
  await newLogin.page.locator('input[type=password]').fill(password);
  await newLogin.page.locator('button[type=submit]').click();
  await newLogin.page.waitForURL('**/revision-prueba');
  passed('a fresh password login also lands on the review notice');
  await row.getByRole('button', { name: 'Revisar y reactivar', exact: true }).click();
  const dialog = manager.page.getByRole('dialog');
  await dialog.getByLabel('Nombre real del taller').fill(workshopName);
  await dialog.getByLabel('Ciudad', { exact: true }).fill('Bogotá');
  await dialog.getByLabel('Dirección comprobada').fill('Calle 100 # 20-30');
  await dialog.getByLabel('Responsable del taller').fill('Responsable ficticio');
  await dialog.getByLabel('Celular confirmado').fill('3001234567');
  await dialog.getByLabel('Evidencia comprobada').fill('Videollamada del taller y ubicación comprobadas.');
  await dialog.getByRole('checkbox').nth(0).check();await dialog.getByRole('checkbox').nth(1).check();await dialog.getByRole('checkbox').nth(2).check();
  await dialog.getByLabel('Conclusión de la verificación (solo administración)').fill('Taller real confirmado directamente con el responsable.');
  await dialog.screenshot({ path: path.join(evidenceDir,'verification-dialog.png') });
  await dialog.getByRole('button', { name: 'Confirmar verificación y reactivar', exact: true }).click();
  await row.getByText('Taller verificado', { exact: true }).waitFor();
  await owner.page.waitForURL('**/dashboard', { timeout: 25000 });
  assert.ifError((await fixtures.owner.client.from('customers').select('id')).error);
  const events = Number(sql("SELECT count(*) FROM motomanager_private.workshop_trial_review_events WHERE organization_id='" + org + "'"));
  assert.equal(events,2);
  const settings = JSON.parse(sql("SELECT settings::text FROM organizations WHERE id='" + org + "'"));
  assert.equal(settings.trialReviewPaused,false);assert.equal(settings.city,'Bogotá');assert.equal(settings.address,'Calle 100 # 20-30');
  passed('verified workshop data is saved and the same owner session recovers access');
  assert.deepEqual(errors,[]);
  report.syntheticUsersOnly = true;report.productionBusinessWrites = 0;report.javascriptErrors = errors;
  fs.writeFileSync(path.join(evidenceDir,'browser-report.json'),JSON.stringify(report,null,2));
  console.log('TRIAL_REVIEW_BROWSER_PASSED',report.checks.length);
} finally {
  await Promise.all(contexts.map(context => context.close()));await browser.close();
}

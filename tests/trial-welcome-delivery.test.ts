import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  deliverTrialWelcome, lastTrialWelcome, TRIAL_WELCOME_DELIVERY_KEY,
  type WelcomeDeliveryDependencies, type WelcomeTarget,
} from '../src/lib/trial-welcome-delivery';

const now = Date.parse('2026-11-05T16:00:00Z');
const actor = '6fe4ef80-2cd4-4801-b7ee-7b5e79a65354';
const first = '12e8d06a-5d4a-4434-82a1-6dfd964dcfe6';
const second = '2419c444-4970-46d2-aa7c-5ffac4ecb2bf';
const input = {
  phone: '573001234567', fullName: 'Ana Pérez', workshopName: 'Taller de prueba',
  email: 'ana@example.test', startsAt: '2026-11-03T16:00:00Z', endsAt: '2026-11-18T16:00:00Z', optedIn: true,
};
function repository() {
  let settings: Record<string, unknown> = {
    plan: 'full', isTrial: true, trialStartDate: input.startsAt, trialEndDate: input.endsAt,
    businessHours: { monday: '08:00' }, whatsappSent: 7,
  };
  let calls = 0;
  const target: WelcomeTarget = { settings, input: { ...input } };
  const deps: WelcomeDeliveryDependencies = {
    now: () => now,
    load: async () => ({ target: { ...target, settings: structuredClone(settings) } }),
    compareAndSet: async (expected, updated) => {
      if (JSON.stringify(settings) !== JSON.stringify(expected)) return false;
      settings = structuredClone(updated); return true;
    },
    send: async () => { calls++; return { status: 'accepted', messageId: 'wamid.synthetic-test' }; },
  };
  return {
    deps, target, calls: () => calls, settings: () => structuredClone(settings),
    update: (changes: Record<string, unknown>) => { settings = { ...settings, ...changes }; },
  };
}

test('manual welcome resends are idempotent and preserve plan, quotas, dates and hours', async () => {
  const repo = repository();
  const before = repo.settings();
  const sent = await deliverTrialWelcome(first, 'admin', actor, repo.deps);
  assert.equal(sent.success, true);
  assert.equal(sent.status, 'accepted');
  assert.equal(repo.calls(), 1);
  assert.deepEqual(await deliverTrialWelcome(first, 'admin', actor, repo.deps), sent);
  assert.equal(repo.calls(), 1);
  const saved = repo.settings();
  for (const key of Object.keys(before)) assert.deepEqual(saved[key], before[key]);
  assert.equal(lastTrialWelcome(saved)?.actorId, actor);
  assert.equal(lastTrialWelcome(saved)?.source, 'admin');
  assert.equal(lastTrialWelcome(saved)?.messageId, 'wamid.synthetic-test');
});

test('two simultaneous resend requests cannot both POST a welcome', async () => {
  const repo = repository();
  const results = await Promise.all([
    deliverTrialWelcome(first, 'admin', actor, repo.deps),
    deliverTrialWelcome(second, 'admin', actor, repo.deps),
  ]);
  assert.equal(repo.calls(), 1);
  assert.equal(results.filter(result => result.success).length, 1);
  assert.equal(results.filter(result => result.status === 'blocked').length, 1);
});

test('consent, active trial and a valid request are required before any WhatsApp call', async () => {
  for (const scenario of ['consent', 'expired', 'paid', 'invalid-request', 'unverified-owner']) {
    const repo = repository();
    if (scenario === 'consent') repo.target.input.optedIn = false;
    if (scenario === 'expired') repo.update({ trialEndDate: new Date(now).toISOString() });
    if (scenario === 'paid') repo.update({ isTrial: false });
    if (scenario === 'unverified-owner') repo.deps.load = async () => ({ error: 'Propietario no verificado' });
    const result = await deliverTrialWelcome(scenario === 'invalid-request' ? 'bad' : first, 'admin', actor, repo.deps);
    assert.equal(result.success, false);
    assert.equal(repo.calls(), 0);
    assert.equal(lastTrialWelcome(repo.settings()), null);
  }
});

test('a timeout stays unconfirmed and automatic activation never replays the POST', async () => {
  const repo = repository();
  let sends = 0;
  repo.deps.send = async () => { sends++; throw Error('synthetic timeout'); };
  const result = await deliverTrialWelcome(first, 'activation', actor, repo.deps);
  assert.equal(result.status, 'unconfirmed');
  assert.equal(lastTrialWelcome(repo.settings())?.status, 'unconfirmed');
  await deliverTrialWelcome(first, 'admin', actor, repo.deps);
  await deliverTrialWelcome(second, 'activation', actor, repo.deps);
  assert.equal(sends, 1);
});

test('manual resending allows a deliberate new request after cooldown and keeps original trial dates', async () => {
  const repo = repository();
  await deliverTrialWelcome(first, 'activation', actor, repo.deps);
  assert.equal((await deliverTrialWelcome(second, 'admin', actor, repo.deps)).status, 'blocked');
  repo.deps.now = () => now + 60_001;
  assert.equal((await deliverTrialWelcome(second, 'admin', actor, repo.deps)).status, 'accepted');
  assert.equal(repo.calls(), 2);
  assert.equal(repo.settings().trialEndDate, input.endsAt);
});

test('saving a result preserves a simultaneous settings update and never retries the network', async () => {
  const repo = repository();
  repo.deps.send = async () => {
    repo.update({ plan: 'full', businessHours: { monday: '09:00' }, whatsappSent: 9 });
    return { status: 'accepted', messageId: 'wamid.concurrent-update' };
  };
  assert.equal((await deliverTrialWelcome(first, 'admin', actor, repo.deps)).recorded, true);
  assert.deepEqual(repo.settings().businessHours, { monday: '09:00' });
  assert.equal(repo.settings().whatsappSent, 9);
  assert.equal(lastTrialWelcome(repo.settings())?.messageId, 'wamid.concurrent-update');

  const broken = repository();
  let writes = 0;
  const cas = broken.deps.compareAndSet;
  broken.deps.compareAndSet = async (expected, updated) => {
    if (++writes > 1) throw Error('synthetic persistence failure');
    return cas(expected, updated);
  };
  const result = await deliverTrialWelcome(first, 'admin', actor, broken.deps);
  assert.equal(result.success, true);
  assert.equal(result.recorded, false);
  assert.equal(broken.calls(), 1);
  await deliverTrialWelcome(second, 'admin', actor, broken.deps);
  assert.equal(broken.calls(), 1);
});

test('definitive rejection is recorded with numeric diagnostics and no secrets or recipient content', async () => {
  const repo = repository();
  repo.deps.send = async () => ({ status: 'unconfirmed', reason: 'provider_rejected', httpStatus: 400, metaCode: 132001 });
  const result = await deliverTrialWelcome(first, 'admin', actor, repo.deps);
  assert.equal(result.status, 'rejected');
  assert.equal(lastTrialWelcome(repo.settings())?.metaCode, 132001);
  assert.doesNotMatch(JSON.stringify(repo.settings()[TRIAL_WELCOME_DELIVERY_KEY]), /573001234567|ana@example|password|token/i);
});

test('both administrator actions authenticate before any privileged welcome operation', async () => {
  const source = await readFile(new URL('../src/app/admin/trial-welcome-actions.ts', import.meta.url), 'utf8');
  const preview = source.slice(source.indexOf('export async function getTrialWelcomePreview'), source.indexOf('export async function resendTrialWelcome'));
  const resend = source.slice(source.indexOf('export async function resendTrialWelcome'));
  assert.ok(preview.indexOf('await requireSuperAdmin()') < preview.indexOf('await previewTrialWelcome('));
  assert.ok(resend.indexOf('await requireSuperAdmin()') < resend.indexOf('await sendWorkshopTrialWelcome('));
  assert.doesNotMatch(source, /phone:|temp_password|resetUserPassword|updateUserById/);
});

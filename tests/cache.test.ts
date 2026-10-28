import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopCache, type CacheStore } from '../src/lib/cache/workshop-cache';
import { internalSupabaseURL, isDatabaseMutation, mutationWorkshops } from '../src/lib/supabase/transport';

class MemoryStore implements CacheStore {
  values = new Map<string, { value: string; expires: number }>();
  now = 0;
  async get(key: string) {
    const found = this.values.get(key);
    if (found && found.expires > this.now) return found.value;
    this.values.delete(key); return null;
  }
  async set(key: string, value: string, ttl = Infinity) { this.values.set(key, { value, expires: this.now + ttl * 1000 }); }
  async setIfAbsent(key: string, value: string) { if (await this.get(key) === null) await this.set(key, value); }
}
const actor = { workshopId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', userId: 'owner-a', role: 'owner' };
const other = { ...actor, workshopId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' };

test('Redis read cache separates organizations, users, roles, permissions, filters and pages', async () => {
  const store = new MemoryStore(); const cache = new WorkshopCache(() => store);
  let calls = 0; const load = async () => ++calls;
  assert.equal(await cache.remember(actor, 'inventory', { page: 1, query: 'ana' }, load), 1);
  assert.equal(await cache.remember(actor, 'inventory', { query: 'ana', page: 1 }, load), 1);
  for (const [identity, params] of [
    [other, { page: 1, query: 'ana' }], [{ ...actor, userId: 'mechanic' }, { page: 1, query: 'ana' }],
    [{ ...actor, role: 'mechanic' }, { page: 1, query: 'ana' }], [{ ...actor, custom_permissions: ['/inventory'] }, { page: 1, query: 'ana' }],
    [actor, { page: 2, query: 'ana' }], [actor, { page: 1, query: 'bob' }],
  ] as const) await cache.remember(identity, 'inventory', params, load);
  assert.equal(calls, 7);
  assert.ok([...store.values.keys()].filter(key => key.includes(':data:')).every(key => /^[a-f0-9]{64}$/.test(key.split(':').at(-1)!)));
});

test('tenant invalidation leaves other workshops warm; unknown scope invalidates every workshop', async () => {
  const cache = new WorkshopCache(() => newStore); const newStore = new MemoryStore();
  let revision = 1; const load = async () => revision;
  await cache.remember(actor, 'inventory', {}, load); await cache.remember(other, 'inventory', {}, load);
  revision = 2; await cache.invalidate([actor.workshopId]);
  assert.equal(await cache.remember(actor, 'inventory', {}, load), 2);
  assert.equal(await cache.remember(other, 'inventory', {}, load), 1);
  await cache.invalidate();
  assert.equal(await cache.remember(other, 'inventory', {}, load), 2);
});

test('expiration and generation eviction cannot resurrect an older cached result', async () => {
  const store = new MemoryStore(); const cache = new WorkshopCache(() => store, 'test', 15);
  let revision = 1; const load = async () => revision;
  await cache.remember(actor, 'customers', {}, load);
  revision = 2; store.now = 15001;
  assert.equal(await cache.remember(actor, 'customers', {}, load), 2);
  revision = 3;
  for (const key of store.values.keys()) if (key.includes(':generation:')) store.values.delete(key);
  assert.equal(await cache.remember(actor, 'customers', {}, load), 3);
});

test('concurrent requests coalesce and a mutation during loading cannot refill the current generation with old data', async () => {
  const store = new MemoryStore(); const cache = new WorkshopCache(() => store);
  let finish!: (value: number) => void; let started!: () => void;
  const gate = new Promise<void>(resolve => { started = resolve; });
  let calls = 0;
  const load = () => { calls++; started(); return new Promise<number>(resolve => { finish = resolve; }); };
  const first = cache.remember(actor, 'sales', {}, load);
  await gate;
  const second = cache.remember(actor, 'sales', {}, load);
  // Let the second read complete its Redis lookups and join the in-flight load.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  await cache.invalidate([actor.workshopId]);
  assert.equal(await cache.remember(actor, 'sales', {}, async () => 2), 2);
  finish(1); assert.deepEqual(await Promise.all([first, second]), [1, 1]);
  assert.equal(await cache.remember(actor, 'sales', {}, async () => 999), 2);
});

test('disabled or failing cache keeps the database working; source errors propagate and are not cached', async () => {
  assert.equal(await new WorkshopCache(() => null).remember(actor, 'x', {}, async () => 42), 42);
  const broken = { get: async () => { throw new Error('offline'); }, set: async () => {}, setIfAbsent: async () => {} };
  assert.equal(await new WorkshopCache(() => broken).remember(actor, 'x', {}, async () => 42), 42);
  const store = new MemoryStore(); const cache = new WorkshopCache(() => store);
  await assert.rejects(cache.remember(actor, 'x', {}, async () => { throw new Error('database denied'); }), /database denied/);
  assert.equal(await cache.remember(actor, 'x', {}, async () => 7), 7);
  await assert.rejects(cache.remember({ ...actor, workshopId: null }, 'x', {}, async () => 1), /Authenticated workshop/);
});

test('oversized results remain available without filling Redis with huge payloads', async () => {
  const store = new MemoryStore(); const cache = new WorkshopCache(() => store);
  const text = 'x'.repeat(600000);
  assert.equal(await cache.remember(actor, 'large', {}, async () => text), text);
  assert.ok(![...store.values.keys()].some(key => key.includes(':data:')));
});

test('internal routing changes only the configured API transport, preserving path/query and unrelated URLs', () => {
  const external = 'https://api.example.test'; const internal = 'http://kong:8000';
  assert.equal(internalSupabaseURL(external + '/auth/v1/user', external, internal), internal + '/auth/v1/user');
  assert.equal(internalSupabaseURL(external + '/rest/v1/sales?organization_id=eq.a', external, internal), internal + '/rest/v1/sales?organization_id=eq.a');
  assert.equal(internalSupabaseURL('https://other.test/path', external, internal), 'https://other.test/path');
  assert.equal(internalSupabaseURL(external + '/rest/v1/x', external, undefined), external + '/rest/v1/x');
  assert.equal(internalSupabaseURL('https://api.test/base/rest/v1/x', 'https://api.test/base', 'https://inside.test/api'), 'https://inside.test/api/rest/v1/x');
  assert.throws(() => internalSupabaseURL(external, external, 'file:///etc/passwd'), /protocol/);
});

test('writes invalidate, read-only RPCs do not, and ambiguous scopes invalidate globally', () => {
  const url = 'https://api.test/rest/v1/';
  assert.equal(isDatabaseMutation(url + 'sales', 'GET'), false);
  assert.equal(isDatabaseMutation(url + 'sales', 'PATCH'), true);
  assert.equal(isDatabaseMutation(url + 'rpc/decrement_inventory', 'POST'), true);
  assert.equal(isDatabaseMutation(url + 'rpc/workshop_dashboard_summary', 'POST'), false);
  assert.equal(isDatabaseMutation('https://api.test/auth/v1/token', 'POST'), false);
  assert.deepEqual(mutationWorkshops(url + 'sales?organization_id=eq.' + actor.workshopId), [actor.workshopId]);
  assert.deepEqual(mutationWorkshops(url + 'rpc/update_workshop_profile_fields', JSON.stringify({ p_organization_id: actor.workshopId })), [actor.workshopId]);
  assert.deepEqual(mutationWorkshops(url + 'profiles?id=eq.x', JSON.stringify({ organization_id: actor.workshopId })), []);
  assert.deepEqual(mutationWorkshops(url + 'sales?id=eq.x'), []);
});

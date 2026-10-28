import test from 'node:test';
import assert from 'node:assert/strict';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { WorkshopCache, type CacheStore } from '../src/lib/cache/workshop-cache';

test('real Redis: shared cache across application instances, invalidation and measured warm reads', { skip: !process.env.TEST_REDIS_URL }, async () => {
  const redis = new Redis(process.env.TEST_REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 0 });
  await redis.connect();
  const prefix = 'mm-test:' + randomUUID();
  const store: CacheStore = {
    get: key => redis.get(key),
    async set(key, value, ttl) { if (ttl) await redis.set(key, value, 'EX', ttl); else await redis.set(key, value); },
    async setIfAbsent(key, value) { await redis.set(key, value, 'NX'); },
  };
  const instanceA = new WorkshopCache(() => store, prefix);
  const instanceB = new WorkshopCache(() => store, prefix);
  const user = { workshopId: randomUUID(), userId: randomUUID(), role: 'owner' };
  let sourceCalls = 0;
  const source = async () => { sourceCalls++; await new Promise(resolve => setTimeout(resolve, 30)); return { count: 680 }; };
  try {
    const cold = performance.now(); await instanceA.remember(user, 'inventory', {}, source); const coldMs = performance.now() - cold;
    const warm = performance.now();
    for (let i = 0; i < 20; i++) assert.deepEqual(await instanceB.remember(user, 'inventory', {}, source), { count: 680 });
    const warmMeanMs = (performance.now() - warm) / 20;
    assert.equal(sourceCalls, 1, '20 reads in another instance must not re-query the source');
    await instanceA.invalidate([user.workshopId]);
    await instanceB.remember(user, 'inventory', {}, source); assert.equal(sourceCalls, 2);
    console.log(JSON.stringify({ test: 'local Redis; source delay simulated at 30ms, not a production latency measurement', coldMs: +coldMs.toFixed(2), warmMeanMs: +warmMeanMs.toFixed(2), sourceCallsBeforeInvalidation: 1, warmReads: 20 }));
  } finally {
    const keys = await redis.keys(prefix + ':*'); // Test-only unique namespace.
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  }
});

test('real managed SDK transport: successful writes invalidate, errors do not, and routing keeps the public session storage key', { skip: !process.env.TEST_REDIS_URL }, async () => {
  process.env.REDIS_URL = process.env.TEST_REDIS_URL;
  process.env.CACHE_NAMESPACE = 'mm-managed-test:' + randomUUID();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public-project.example.test';
  process.env.SUPABASE_INTERNAL_URL = 'http://kong:8000';
  const { workshopCache, cacheConnectionStatus, closeCacheConnection } = await import('../src/lib/cache/redis');
  const { managedSupabaseFetch } = await import('../src/lib/supabase/managed-fetch');
  const { createClient } = await import('../src/lib/supabase/managed-client');
  const user = { workshopId: randomUUID(), userId: randomUUID(), role: 'owner' };
  let sourceCalls = 0;
  const source = async () => ++sourceCalls;
  try {
    await workshopCache.remember(user, 'inventory', {}, source);
    for (let i = 0; i < 30 && cacheConnectionStatus() !== 'ready'; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(cacheConnectionStatus(), 'ready');
    const before = await workshopCache.remember(user, 'inventory', {}, source);
    await workshopCache.remember(user, 'inventory', {}, source);
    const requests: string[] = [];
    const fetchOK = managedSupabaseFetch(async input => { requests.push(String(input)); return new Response('{}', { status: 201 }); });
    const mutation = 'https://public-project.example.test/rest/v1/inventory_items?organization_id=eq.' + user.workshopId;
    await fetchOK(mutation, { method: 'PATCH', body: JSON.stringify({ quantity: 12 }) });
    assert.equal(await workshopCache.remember(user, 'inventory', {}, source), before + 1);
    assert.equal(requests[0], 'http://kong:8000/rest/v1/inventory_items?organization_id=eq.' + user.workshopId);
    const fetchFailed = managedSupabaseFetch(async () => new Response('{}', { status: 400 }));
    await fetchFailed(mutation, { method: 'PATCH' });
    assert.equal(await workshopCache.remember(user, 'inventory', {}, source), before + 1);
    const client = createClient('https://public-project.example.test', 'local-fixture-key', {
      global: { fetch: async input => { requests.push(String(input)); return new Response('[]', { status: 200 }); } },
    });
    assert.equal((client.auth as any).storageKey, 'sb-public-project-auth-token');
    await client.from('customers').select('id');
    assert.ok(requests.at(-1)?.startsWith('http://kong:8000/rest/v1/customers'));
  } finally {
    closeCacheConnection();
    const redis = new Redis(process.env.TEST_REDIS_URL!);
    const keys = await redis.keys(process.env.CACHE_NAMESPACE + ':*');
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  }
});

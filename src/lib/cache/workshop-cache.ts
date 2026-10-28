import { createHash, randomUUID } from 'node:crypto';

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  setIfAbsent(key: string, value: string): Promise<void>;
}

export interface CacheActor {
  workshopId: string | null;
  userId: string;
  role: string;
  custom_permissions?: unknown;
}

export const cacheMetrics = { hits: 0, misses: 0, bypasses: 0, coalesced: 0, errors: 0, invalidations: 0, oversized: 0 };

function stableJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
}

export class WorkshopCache {
  private pending = new Map<string, Promise<unknown>>();
  constructor(private store: () => CacheStore | null, private namespace = 'motomanager:reads:v1', private ttlSeconds = 15) {}

  private async generation(store: CacheStore, scope: string) {
    const key = `${this.namespace}:generation:${scope}`;
    let value = await store.get(key);
    if (!value) {
      // Random generations also prevent old entries resurfacing after eviction.
      await store.setIfAbsent(key, randomUUID());
      value = await store.get(key);
    }
    if (!value) throw new Error('Cache generation unavailable');
    return value;
  }

  async remember<T>(actor: CacheActor, dataset: string, params: unknown, load: () => Promise<T>): Promise<T> {
    if (!actor.workshopId || !actor.userId) throw new Error('Authenticated workshop required');
    const store = this.store();
    if (!store) { cacheMetrics.bypasses++; return load(); }
    let key: string;
    try {
      const [global, tenant] = await Promise.all([
        this.generation(store, 'global'), this.generation(store, actor.workshopId),
      ]);
      // Never store tokens or session objects. Identity and current permissions
      // participate in a hash to preserve RLS differences between users/roles.
      const digest = createHash('sha256').update(stableJSON({
        user: actor.userId, role: actor.role, permissions: actor.custom_permissions, dataset, params,
      })).digest('hex');
      key = `${this.namespace}:data:${actor.workshopId}:${global}:${tenant}:${digest}`;
      const cached = await store.get(key);
      if (cached !== null) { const value = JSON.parse(cached) as T; cacheMetrics.hits++; return value; }
    } catch { cacheMetrics.errors++; return load(); }

    const existing = this.pending.get(key);
    if (existing) { cacheMetrics.coalesced++; return existing as Promise<T>; }
    cacheMetrics.misses++;
    const work = (async () => {
      // Loader errors propagate; failed/unauthorized results are never cached.
      const value = await load();
      try {
        const encoded = JSON.stringify(value);
        if (encoded !== undefined && Buffer.byteLength(encoded) <= 512 * 1024) {
          await store.set(key, encoded, this.ttlSeconds);
        } else { cacheMetrics.oversized++; }
      } catch { cacheMetrics.errors++; }
      return value;
    })();
    this.pending.set(key, work);
    try { return await work; } finally { if (this.pending.get(key) === work) this.pending.delete(key); }
  }

  async invalidate(workshopIds: string[] = []) {
    const store = this.store();
    if (!store) return;
    try {
      const scopes = workshopIds.length ? [...new Set(workshopIds)] : ['global'];
      await Promise.all(scopes.map(scope => store.set(`${this.namespace}:generation:${scope}`, randomUUID())));
      cacheMetrics.invalidations++;
    } catch { cacheMetrics.errors++; }
  }
}

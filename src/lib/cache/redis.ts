import Redis from 'ioredis';
import { WorkshopCache, type CacheStore } from './workshop-cache';

let client: Redis | undefined;
let lastWarning = 0;

function store(): CacheStore | null {
  if (!process.env.REDIS_URL || process.env.CACHE_ENABLED === 'false') return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false, maxRetriesPerRequest: 0,
      connectTimeout: 300, commandTimeout: 150,
      retryStrategy: attempt => Math.min(attempt * 500, 10000),
      connectionName: 'motomanager-read-cache',
    });
    client.on('error', () => {
      if (Date.now() - lastWarning > 60000) {
        lastWarning = Date.now();
        console.warn('[cache] Redis unavailable; using the database.');
      }
    });
  }
  if (client.status !== 'ready') return null;
  const redis = client;
  return {
    get: key => redis.get(key),
    async set(key, value, ttl) {
      if (ttl) await redis.set(key, value, 'EX', ttl);
      else await redis.set(key, value);
    },
    async setIfAbsent(key, value) { await redis.set(key, value, 'NX'); },
  };
}

const ttl = Number(process.env.CACHE_TTL_SECONDS || 15);
export const workshopCache = new WorkshopCache(store,
  process.env.CACHE_NAMESPACE || 'motomanager:reads:v1',
  Number.isFinite(ttl) ? Math.min(30, Math.max(1, Math.floor(ttl))) : 15);

export function cacheConnectionStatus() {
  return !process.env.REDIS_URL || process.env.CACHE_ENABLED === 'false' ? 'disabled' : client?.status || 'not-started';
}

export function closeCacheConnection() {
  client?.disconnect();
  client = undefined;
}

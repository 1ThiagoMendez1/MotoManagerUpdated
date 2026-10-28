import 'server-only';
import { workshopCache } from '@/lib/cache/redis';
import { internalSupabaseFetch, isDatabaseMutation, mutationWorkshops } from './transport';

export function managedSupabaseFetch(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  const routedFetch = internalSupabaseFetch(baseFetch);
  return async (input, init) => {
    const originalURL = input instanceof Request ? input.url : String(input);
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    const response = await routedFetch(input, init);
    if (response.ok && isDatabaseMutation(originalURL, method)) {
      // Invalidate after commit, including service-role calls, webhooks and RPCs.
      // Unknown scopes invalidate globally rather than guessing a tenant.
      await workshopCache.invalidate(mutationWorkshops(originalURL, init?.body));
    }
    return response;
  };
}

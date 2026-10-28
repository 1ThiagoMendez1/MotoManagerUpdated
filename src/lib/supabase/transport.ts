// Pure transport helpers: never change the SDK's public URL/storage key, which
// must remain identical in the browser and server for session cookies to work.
export function internalSupabaseURL(input: string, publicBase?: string, internalBase?: string) {
  if (!publicBase || !internalBase) return input;
  const source = new URL(input);
  const external = new URL(publicBase);
  const internal = new URL(internalBase);
  const prefix = external.pathname.replace(/\/$/, '');
  if (!['http:', 'https:'].includes(internal.protocol)) throw new Error('Invalid Supabase internal protocol');
  if (source.origin !== external.origin || (prefix && source.pathname !== prefix && !source.pathname.startsWith(prefix + '/'))) return input;
  internal.pathname = internal.pathname.replace(/\/$/, '') + source.pathname.slice(prefix.length);
  internal.search = source.search;
  return internal.toString();
}

// Edge-compatible: middleware must use the private route as well as SSR.
export function internalSupabaseFetch(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    const original = input instanceof Request ? input.url : String(input);
    const routed = internalSupabaseURL(original, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_INTERNAL_URL);
    const target = routed === original ? input : input instanceof Request ? new Request(routed, input) : routed;
    return baseFetch(target, init);
  };
}

const readRPCs = new Set([
  'workshop_dashboard_summary', 'public_workshop_storefront', 'workshop_technicians',
  'get_public_workshop_reputation', 'find_workshop_qr_phone_account',
]);

export function isDatabaseMutation(url: string, method = 'GET') {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return false;
  const path = new URL(url).pathname;
  if (!path.includes('/rest/v1/')) return false;
  const rpc = path.match(/\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
  return !rpc || !readRPCs.has(rpc);
}

export function mutationWorkshops(url: string, body?: BodyInit | null): string[] {
  const parsed = new URL(url);
  // Shared identity/membership writes can affect multiple workshops.
  if (/\/rest\/v1\/(profiles|organization_members)(?:\?|$)/.test(parsed.pathname)) return [];
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) ids.add(value);
  };
  for (const key of ['organization_id', 'workshop_id']) add(parsed.searchParams.get(key)?.replace(/^eq\./, ''));
  if (/\/rest\/v1\/organizations$/.test(parsed.pathname)) add(parsed.searchParams.get('id')?.replace(/^eq\./, ''));
  if (typeof body === 'string') {
    try {
      const data = JSON.parse(body);
      for (const row of Array.isArray(data) ? data : [data]) {
        for (const key of ['organization_id', 'workshop_id', 'p_organization_id', 'p_workshop_id', 'org_id']) add(row?.[key]);
      }
    } catch { /* Unknown mutation bodies conservatively invalidate all scopes. */ }
  }
  return [...ids];
}

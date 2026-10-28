import 'server-only';
import { createClient as sdkCreateClient } from '@supabase/supabase-js';
import { managedSupabaseFetch } from './managed-fetch';

export const createClient = ((url, key, options) => sdkCreateClient(url, key, {
  ...options,
  global: { ...options?.global, fetch: managedSupabaseFetch(options?.global?.fetch || globalThis.fetch) },
})) as typeof sdkCreateClient;

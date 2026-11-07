import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { MyTrialReview } from './trial-review';

// Request-local memoization only. Never cache an access decision in Redis.
export const getMyTrialReview = cache(async (): Promise<MyTrialReview | null> => {
  const client = await createClient();
  const { data, error } = await client.rpc('get_my_trial_review');
  if (error) throw new Error('No se pudo comprobar el estado de acceso del taller.');
  return data as MyTrialReview | null;
});

import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin variables are missing. SUPABASE_SERVICE_ROLE_KEY is required.')
  }

  // Se usa service role únicamente para operaciones administrativas justificadas
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )
}

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase client creation failed: Missing environment variables.', {
            url: !!supabaseUrl,
            key: !!supabaseKey
        });
        throw new Error('Las variables de entorno de Supabase no están configuradas (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Por favor reinicia tu servidor de desarrollo.');
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
}

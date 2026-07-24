import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmvnbolaowazqyzmkccv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtdm5ib2xhb3dhenF5em1rY2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwOTI1MSwiZXhwIjoyMDk5MTg1MjUxfQ.KCYDD4UShe79LAdNA9fvnCnpCRHEw0NFfPM89wpN3n0';

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await adminSupabase.from('organizations').select('*').limit(1);
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, data:', data);
  }
}

main();

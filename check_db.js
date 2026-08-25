require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data } = await supabase.from('service_catalog').select('code, name, status');
  console.log("Services in DB:", data);
}
check();

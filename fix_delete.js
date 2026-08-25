require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function fix() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data, error } = await supabase
    .from('service_catalog')
    .delete()
    .eq('status', 'inactive');
    
  if (error) console.error("Error:", error);
  else console.log("Deleted inactive services.");
}

fix();

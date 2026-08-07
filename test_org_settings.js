require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Settings:', JSON.stringify(data[0].settings, null, 2));
  }
}
main();

const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/(^'|'$|^"|"$)/g, '');
  }
});
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabaseAdmin
    .from('work_orders')
    .select('*')
    .limit(1);
    
  console.log("Error:", error);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Has deposit_amount:", 'deposit_amount' in data[0]);
    console.log("deposit_amount:", data[0].deposit_amount);
    console.log("customer_observations:", data[0].customer_observations);
  }
}

test();

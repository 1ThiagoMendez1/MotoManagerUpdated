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
    .from('organization_members')
    .select('*')
    .eq('organization_id', 'ec9ce390-91bf-4ecf-a893-00d39e2ebe34');
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

test();

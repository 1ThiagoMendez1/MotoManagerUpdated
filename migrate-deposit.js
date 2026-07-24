import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/(^'|'$|^"|"$)/g, '');
  }
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSql() {
  const sql = `
    ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;
  `;
  
  // Try to use a raw query if pg is available, or use a rpc
  // Let's create an RPC or just check if it can run
  
  const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error("RPC exec_sql failed, attempting with direct postgres connection or something else:", error);
  } else {
    console.log("Migration successful via exec_sql");
  }
}
runSql();

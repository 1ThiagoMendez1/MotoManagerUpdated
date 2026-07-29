import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Instead of raw sql which we can't run via regular rest endpoints without rpc, let's try to just select to see if table exists.
  const { error } = await supabase.from('cancellation_feedback').select('id').limit(1);
  if (error) {
    console.error('Error fetching:', error.message);
  } else {
    console.log('Table exists!');
  }
}
run();

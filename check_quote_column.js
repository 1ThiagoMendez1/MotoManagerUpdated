const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.from('work_orders').select('quote_status').limit(1);
  if (error) {
    console.error("Column might not exist:", error);
  } else {
    console.log("Column exists!", data);
  }
}
checkColumns();

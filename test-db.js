const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('subscription_transactions').select('*');
  console.log('subscription_transactions count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log(data[0]);
  }
  if (error) {
    console.error('Error:', error);
  }
  
  const { data: data2 } = await supabase.from('wompi_payments').select('*');
  console.log('wompi_payments count:', data2 ? data2.length : 0);
}
check();

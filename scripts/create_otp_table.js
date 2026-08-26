const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error } = await supabase.rpc('patch_rpc', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.mobile_otp_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
      
      -- Index to speed up verification lookups
      CREATE INDEX IF NOT EXISTS idx_mobile_otp_requests_phone ON public.mobile_otp_requests(phone);
    `
  });

  if (error) {
    console.error('Error creating table:', error);
  } else {
    console.log('mobile_otp_requests table created or verified successfully!');
  }
}

run();

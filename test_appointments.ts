import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      status,
      notes,
      reason,
      created_at,
      created_by,
      accepted_by,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone,
        document_number
      ),
      motorcycles (
        id,
        brand,
        model,
        license_plate
      )
    `);
  
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("SUCCESS, found", data?.length, "appointments");
    console.log(JSON.stringify(data?.slice(0, 2), null, 2));
  }
}

check();

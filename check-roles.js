import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTechs() {
  const { data, error } = await supabase
    .from('tecnicos_activos')
    .select(`
      id, name, specialty, avatar_url,
      work_orders (
        id, work_order_number, issue_description, status, created_at, completed_at,
        motorcycle:motorcycles (
          id, make, model, year, plate, created_at,
          customer:clientes (id, name, email, phone)
        )
      )
    `)
    .eq('workshop_id', '2a9ceeb0-f046-400d-9730-5e74dc82f4ed')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
    
  console.log(JSON.stringify(data, null, 2));
  if (error) console.error(error);
}

checkTechs();

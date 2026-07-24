import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: wos } = await supabase.from('work_orders').select('*').limit(1);
  if (!wos || wos.length === 0) { console.log("No orders"); return; }
  const wo = wos[0];
  
  console.log("Work order:", wo.id, wo.organization_id);
  
  const { data: tech } = await supabase.from('organization_members').select('user_id').eq('organization_id', wo.organization_id).limit(1);
  const tid = tech[0].user_id;
  console.log("Technician ID:", tid);
      
  const { data, error: updateError } = await supabase
            .from('work_orders')
            .update({ assigned_mechanic_id: tid })
            .eq('id', wo.id)
            .eq('organization_id', wo.organization_id)
            .select();
            
  console.log("Update result:", { data, updateError });
}

test();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const orgId = "00000000-0000-0000-0000-000000000000"; // I need the actual org id to test, let's just fetch one
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) { console.log("No org"); return; }
  const org = orgs[0].id;
  
  const { data: mcs } = await supabase.from('motorcycles').select('id, customer_id, notes').eq('organization_id', org).limit(1);
  const mc = mcs[0];
  if (!mc) { console.log("No mc"); return; }
  
  console.log("Calling create_work_order...");
  const { data: newOrderId, error } = await supabase
        .rpc('create_work_order', {
            p_organization_id: org,
            p_customer_id: mc.customer_id,
            p_motorcycle_id: mc.id,
            p_reported_symptoms: mc.notes || "Test"
        });
        
  console.log("Result of RPC:", { newOrderId, error });
  
  if (newOrderId) {
      console.log("Trying to update it to assign technician...");
      // let's grab a technician
      const { data: tech } = await supabase.from('organization_members').select('user_id').eq('organization_id', org).limit(1);
      const tid = tech[0].user_id;
      
      const { data, error: updateError } = await supabase
            .from('work_orders')
            .update({ assigned_mechanic_id: tid, status: 'received', quote_status: 'pending' })
            .eq('id', newOrderId)
            .eq('organization_id', org)
            .select();
            
      console.log("Update result:", { data, updateError });
  }
}

test();

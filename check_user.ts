import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'sebas@gmail.com');
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('Found user:', user.id);
  
  const { data: orgMembers, error: orgError } = await supabaseAdmin
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('Org members:', orgMembers);
  
  if (orgMembers && orgMembers.length > 0) {
    const orgId = orgMembers[0].organization_id;
    const { data: org, error: fetchOrgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId);
      
    console.log('Organization:', org);
  }
}
check();

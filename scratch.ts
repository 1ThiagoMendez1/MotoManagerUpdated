import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkDB() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("Checking organizations...");
  const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
  console.log("Orgs:", orgs, orgsError);

  console.log("Checking organization_members...");
  const { data: members, error: membersError } = await supabase.from('organization_members').select('*');
  console.log("Members:", members, membersError);
  
  console.log("Checking auth users...");
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  console.log("Users:", users.users.map(u => ({ id: u.id, email: u.email })), usersError);
}

checkDB().catch(console.error);

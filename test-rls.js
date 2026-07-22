const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Get an existing user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  if (users.users.length === 0) {
    console.log("No users found");
    return;
  }
  const user = users.users[0];
  console.log("Testing with user:", user.email);

  // 2. Create a client with this user's anon key and simulate auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // We can't easily sign in without password, but we can call a function or just trust the analysis.
  // Actually, let's execute SQL using admin to check the policy logic
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: `
      EXPLAIN ANALYZE SELECT * FROM public.inventory_items;
    `
  });
  
  console.log("RPC Error:", error);
}

main();

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: `
      drop policy if exists "Tenant isolation for tickets" on public.tickets;
      create policy "Tenant isolation for tickets" on public.tickets 
        for all 
        using (workshop_id in (select get_my_workshop_ids()))
        with check (workshop_id in (select get_my_workshop_ids()));
        
      drop policy if exists "Insert ticket policy" on public.tickets;
      create policy "Insert ticket policy" on public.tickets
        for insert
        with check (workshop_id in (select get_my_workshop_ids()));
    `
  });
  
  console.log("Error:", error);
}

main();

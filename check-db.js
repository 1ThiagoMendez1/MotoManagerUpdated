require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Find the ticket 'prueba'
  const { data: tickets } = await supabase.from('tickets').select('id, subject, status').order('created_at', { ascending: false }).limit(3);
  console.log("Recent tickets:", JSON.stringify(tickets, null, 2));

  if (tickets && tickets.length > 0) {
    const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', tickets[0].id).order('created_at', { ascending: true });
    console.log(`Messages for ticket ${tickets[0].id}:`, JSON.stringify(msgs, null, 2));
  }
}
main();

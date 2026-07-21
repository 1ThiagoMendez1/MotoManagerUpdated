require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('ticket_messages').select(`
            id, message, created_at, sender_id,
            sender:user_profiles!sender_id (name, email)
        `).order('created_at', { ascending: false }).limit(5);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}
main();

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function main() {
    const orgId = "9b755bf7-8f9d-487f-b5ce-f92c04399ac0";
    const settings = { plan: "demo", test: "from_script" };
    
    console.log("Updating org:", orgId);
    
    const { data, error } = await supabaseAdmin
        .from('organizations')
        .update({ settings })
        .eq('id', orgId)
        .select();
        
    console.log("Data:", data);
    console.log("Error:", error);
}

main().catch(console.error);

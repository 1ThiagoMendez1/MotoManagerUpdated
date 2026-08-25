const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newAction = `
export async function getKardexMovements(itemId: string) {
    const user = await requireWorkshop();
    
    // We use the service role client here to bypass any complex RLS recursion 
    // that might be caused by joins on profiles/organization_members.
    // We enforce security manually by filtering strictly by the user's workshopId.
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabaseAdmin
      .from('inventory_movements')
      .select('*, from_loc:inventory_locations!inventory_movements_from_location_id_fkey(name), to_loc:inventory_locations!inventory_movements_to_location_id_fkey(name), user:profiles(first_name, last_name)')
      .eq('item_id', itemId)
      .eq('organization_id', user.workshopId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching kardex admin:', error);
        return { error: error.message };
    }
    
    return { data: data || [] };
}
`;

content += newAction;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Added getKardexMovements action');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/inventory/ItemKardexModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace createClient import with the action import
content = content.replace(
  "import { createClient } from '@/lib/supabase/client';",
  "import { getKardexMovements } from '@/lib/actions/inventory';"
);

// Replace the loadMovements function
const oldLoadMovements = `  async function loadMovements() {
    setIsLoading(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, from_loc:inventory_locations!inventory_movements_from_location_id_fkey(name), to_loc:inventory_locations!inventory_movements_to_location_id_fkey(name), user:profiles(first_name, last_name)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching kardex:', error); setErrorMsg(error.message); }
    if (data) setMovements(data);
    setIsLoading(false);
  }`;

const newLoadMovements = `  async function loadMovements() {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
        const response = await getKardexMovements(item.id);
        if (response.error) {
            setErrorMsg(response.error);
        } else if (response.data) {
            setMovements(response.data);
        }
    } catch (e: any) {
        setErrorMsg(e.message || 'Error de conexión');
    }
    
    setIsLoading(false);
  }`;

content = content.replace(oldLoadMovements, newLoadMovements);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed modal to use Server Action');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newAction = `
export async function transferStock(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    
    const itemId = formData.get('itemId') as string;
    const fromLocId = formData.get('fromLocationId') as string;
    const toLocId = formData.get('toLocationId') as string;
    const qty = parseInt(formData.get('quantity') as string, 10);

    if (!itemId || !fromLocId || !toLocId || isNaN(qty) || qty <= 0) {
        return { message: 'Datos inválidos para el traslado.' };
    }

    // Since transferring stock is a multi-step process (decrement from, increment to, write movement),
    // we should use a transaction via a Postgres function, OR just do it sequentially if we don't have one.
    // Wait, we have the "decrement_inventory" RPC! But we don't have an "increment_inventory" RPC.
    // Let's do it sequentially since we're in server action, but ideally this should be a transaction.
    
    // Check if source has enough
    const { data: sourceStock } = await supabase
      .from('inventory_item_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', fromLocId)
      .single();

    if (!sourceStock || sourceStock.quantity < qty) {
       return { message: 'Stock insuficiente en la ubicación de origen.' };
    }

    // Decrement from source
    const { error: decError } = await supabase
      .from('inventory_item_stock')
      .update({ quantity: sourceStock.quantity - qty })
      .eq('item_id', itemId)
      .eq('location_id', fromLocId);

    if (decError) return { message: 'Error descontando stock.' };

    // Increment to dest
    const { data: destStock } = await supabase
      .from('inventory_item_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', toLocId)
      .maybeSingle();

    if (destStock) {
       await supabase
         .from('inventory_item_stock')
         .update({ quantity: destStock.quantity + qty })
         .eq('item_id', itemId)
         .eq('location_id', toLocId);
    } else {
       await supabase
         .from('inventory_item_stock')
         .insert({ item_id: itemId, location_id: toLocId, quantity: qty });
    }

    // Record movement
    await supabase.from('inventory_movements').insert({
      organization_id: user.workshopId,
      item_id: itemId,
      from_location_id: fromLocId,
      to_location_id: toLocId,
      quantity: qty,
      movement_type: 'transfer',
      created_by: user.userId
    });

    revalidatePath('/inventory');
    return { success: true };
}
`;

content += newAction;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added transferStock action');

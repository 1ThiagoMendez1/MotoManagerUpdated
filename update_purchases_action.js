const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/purchases.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update schema
content = content.replace(
  "supplierId: z.string().optional(),\n  items: z.array(purchaseItemSchema)",
  "supplierId: z.string().optional(),\n  destination: z.string().optional(),\n  items: z.array(purchaseItemSchema)"
);

// Update RPC call
const oldRpcCall = `  const { error: rpcError } = await supabase.rpc('process_purchase_receipt', {
    p_purchase_id: purchase.id,
    p_user_id: user.userId,
  });`;

const newRpcCall = `  
  // Resolve destination location ID if provided as 'warehouse' or 'storefront'
  let p_location_id = null;
  if (data.destination) {
     const { data: loc } = await supabase
        .from('inventory_locations')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('type', data.destination)
        .limit(1)
        .maybeSingle();
     if (loc) p_location_id = loc.id;
  }

  const { error: rpcError } = await supabase.rpc('process_purchase_receipt', {
    p_purchase_id: purchase.id,
    p_user_id: user.userId,
    p_location_id: p_location_id
  });`;

content = content.replace(oldRpcCall, newRpcCall);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated purchases action');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update create schema
const oldSchema = `export const createInventorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().min(1, 'El SKU es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  supplier: z.string().optional(),
  supplierPrice: z.number().optional(),
  quantity: z.number().optional(),
  minimumQuantity: z.number().optional(),
  trackInventoryVal: z.string().optional(),
});`;

const newSchema = `export const createInventorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().min(1, 'El SKU es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  supplier: z.string().optional(),
  supplierPrice: z.number().optional(),
  quantity: z.number().optional(),
  minimumQuantity: z.number().optional(),
  trackInventoryVal: z.string().optional(),
  destination: z.string().optional().default('storefront'),
  location: z.string().optional(),
});`;

content = content.replace(oldSchema, newSchema);

// Update create insertion
const oldInsert = `    const { data: insertedItem, error: insertError } = await supabase.from('inventory_items').insert({
      organization_id: user.workshopId,
      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      supplier: data.supplier,
      last_cost: data.supplierPrice || 0,
      minimum_quantity: data.minimumQuantity || 0,
      track_inventory: trackInventory
    }).select('id').single();`;

const newInsert = `    const { data: insertedItem, error: insertError } = await supabase.from('inventory_items').insert({
      organization_id: user.workshopId,
      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      supplier: data.supplier,
      last_cost: data.supplierPrice || 0,
      minimum_quantity: data.minimumQuantity || 0,
      track_inventory: trackInventory,
      location: data.location || ''
    }).select('id').single();`;

content = content.replace(oldInsert, newInsert);

// Update the stock logic
const oldStockLogic = `        // Put initial stock in vitrina (storefront)
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .single();

        if (vitrinaLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: vitrinaLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: vitrinaLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase',
                    created_by: user.userId
                });
            }
        }`;

const newStockLogic = `        // Put initial stock in requested destination
        const destType = data.destination === 'warehouse' ? 'warehouse' : 'storefront';
        const { data: destLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', destType)
            .single();

        if (destLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: destLoc.id,
                quantity: data.quantity || 0
            });
            
            if ((data.quantity || 0) > 0) {
                await supabase.from('inventory_movements').insert({
                    organization_id: user.workshopId,
                    item_id: insertedItem.id,
                    from_location_id: null,
                    to_location_id: destLoc.id,
                    quantity: data.quantity,
                    movement_type: 'purchase',
                    created_by: user.userId
                });
            }
        }`;

content = content.replace(oldStockLogic, newStockLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated createInventoryItem action');

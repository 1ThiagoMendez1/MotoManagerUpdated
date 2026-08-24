const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update schema
content = content.replace(
  /const inventorySchema = z\.object\({[\s\S]*?}\);/,
  `const inventorySchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "Categoría es requerida."),
    trackInventory: z.boolean().optional().default(true),
    supplier: z.string().optional(),
    quantity: z.coerce.number().optional().default(0),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    supplierPrice: z.coerce.number().optional().default(0),
    minimumQuantity: z.coerce.number().int().optional().default(0),
});`
);

// Update createInventoryItem
const createOld = `    const { error } = await supabase
        .from('inventory_items')
        .insert({
            organization_id: user.workshopId,
            name: data.name,
            code: data.sku,
            category: data.category,
            // Mapeamos variables extras a description
            description: \`Ubicación: \${data.location} | Proveedor: \${data.supplier} | Costo: \${data.supplierPrice}\`,
            quantity: data.quantity,
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
        });`;

const createNew = `    const { data: insertedItem, error } = await supabase
        .from('inventory_items')
        .insert({
            organization_id: user.workshopId,
            name: data.name,
            code: data.sku,
            category: data.category,
            description: \`Proveedor: \${data.supplier || ''}\`,
            unit_price: data.price,
            min_quantity: data.minimumQuantity,
            track_inventory: data.trackInventory,
            last_cost: data.supplierPrice || 0
        })
        .select()
        .single();

    if (!error && insertedItem && data.trackInventory !== false) {
        // Insert initial stock in Vitrina
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .limit(1)
            .maybeSingle();

        if (vitrinaLoc) {
            await supabase.from('inventory_item_stock').insert({
                item_id: insertedItem.id,
                location_id: vitrinaLoc.id,
                quantity: data.quantity || 0
            });
        }
    }`;

content = content.replace(createOld, createNew);

// Add trackInventory parsing logic before safeParse
content = content.replace(
  /const validatedFields = inventorySchema\.safeParse\(\{/g,
  `const trackInventoryRaw = formData.get('trackInventoryVal');
    const trackInventory = trackInventoryRaw === 'true' || trackInventoryRaw === null; // default true
    
    const validatedFields = inventorySchema.safeParse({`
);

// Replace the location field with trackInventory in the safeParse object
content = content.replace(/location: formData\.get\('location'\),/g, "trackInventory: trackInventory,");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated inventory.ts');

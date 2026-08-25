const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update edit schema
const oldEditSchema = `export const updateInventorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().min(1, 'El SKU es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  supplier: z.string().optional(),
  supplierPrice: z.number().optional(),
  minimumQuantity: z.number().optional(),
  trackInventoryVal: z.string().optional(),
});`;

const newEditSchema = `export const updateInventorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().min(1, 'El SKU es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  supplier: z.string().optional(),
  supplierPrice: z.number().optional(),
  minimumQuantity: z.number().optional(),
  trackInventoryVal: z.string().optional(),
  location: z.string().optional(),
});`;

content = content.replace(oldEditSchema, newEditSchema);

// Update edit query
const oldEditUpdate = `      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      supplier: data.supplier,
      last_cost: data.supplierPrice,
      minimum_quantity: data.minimumQuantity,
      track_inventory: trackInventory
    }).eq('id', data.id).eq('organization_id', user.workshopId);`;

const newEditUpdate = `      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      supplier: data.supplier,
      last_cost: data.supplierPrice,
      minimum_quantity: data.minimumQuantity,
      track_inventory: trackInventory,
      location: data.location || ''
    }).eq('id', data.id).eq('organization_id', user.workshopId);`;

content = content.replace(oldEditUpdate, newEditUpdate);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated updateInventoryItem action');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldSchema = `const inventorySchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "Categoría es requerida."),
    trackInventory: z.boolean().optional().default(true),
    supplier: z.string().optional(),
    quantity: z.coerce.number().optional().default(0),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    supplierPrice: z.coerce.number().optional().default(0),
    minimumQuantity: z.coerce.number().int().optional().default(0),
});`;

const newSchema = `const inventorySchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres."),
    category: z.string().min(2, "Categoría es requerida."),
    trackInventory: z.boolean().optional().default(true),
    supplier: z.string().optional(),
    quantity: z.coerce.number().optional().default(0),
    price: z.coerce.number().positive("El precio debe ser un número positivo."),
    supplierPrice: z.coerce.number().optional().default(0),
    minimumQuantity: z.coerce.number().int().optional().default(0),
    location: z.string().optional(),
    destination: z.string().optional().default('storefront'),
});`;

content = content.replace(oldSchema, newSchema);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Zod schema');

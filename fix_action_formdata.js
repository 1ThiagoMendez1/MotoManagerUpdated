const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldExtract = `    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        trackInventory: trackInventory,
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
    });`;

const newExtract = `    const validatedFields = inventorySchema.safeParse({
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        trackInventory: trackInventory,
        supplier: formData.get('supplier'),
        quantity: formData.get('quantity'),
        price: formData.get('price'),
        supplierPrice: formData.get('supplierPrice'),
        minimumQuantity: formData.get('minimumQuantity'),
        location: formData.get('location'),
        destination: formData.get('destination'),
    });`;

// Replace all occurrences (create and update)
content = content.split(oldExtract).join(newExtract);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed FormData extraction in Server Actions!');

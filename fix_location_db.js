const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix createInventoryItem
const oldCreate = `            description: \`Proveedor: \${data.supplier || ''}\`,`;
const newCreate = `            description: data.location || '',`;
content = content.replace(oldCreate, newCreate);

// 2. Fix updateInventoryItem
const oldUpdate = `      description: \`Proveedor: \${data.supplier || ''}\`,`;
const newUpdate = `      description: data.location || '',`;
content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed location mapping to description column');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update create
const oldCreate = `            description: data.location || '',`;
const newCreate = `            description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),`;
content = content.replace(oldCreate, newCreate);

// Update edit
const oldUpdate = `      description: data.location || '',`;
const newUpdate = `      description: JSON.stringify({ location: data.location || '', supplier: data.supplier || '' }),`;
content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed inventory action to store both in JSON');

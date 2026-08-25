const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/inventory.ts');
let content = fs.readFileSync(filePath, 'utf8');

const oldExtract = `        location: formData.get('location'),
        destination: formData.get('destination'),`;

const newExtract = `        location: formData.get('location') || '',
        destination: formData.get('destination') || undefined,`;

// Replace all occurrences (create and update)
content = content.split(oldExtract).join(newExtract);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed FormData extraction to handle nulls!');

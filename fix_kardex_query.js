const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/inventory/ItemKardexModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "user:users(name)",
  "user:profiles(name)"
);

// Add error logging
content = content.replace(
  "if (data) setMovements(data);",
  "if (error) console.error('Error fetching kardex:', error);\n    if (data) setMovements(data);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Kardex query');

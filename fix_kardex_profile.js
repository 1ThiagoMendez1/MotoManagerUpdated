const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/inventory/ItemKardexModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix query
content = content.replace(
  "user:profiles(name)",
  "user:profiles(first_name, last_name)"
);

// Fix UI display
content = content.replace(
  "{m.user?.name || 'Sistema'}",
  "{m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() : 'Sistema'}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed profile columns in Kardex');

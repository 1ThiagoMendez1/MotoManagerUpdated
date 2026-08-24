const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "const inventory = await getInventory(workshop?.id || '');",
  "const inventoryData = await getInventory({ limit: 1000 } as any);"
);

content = content.replace(
  "inventory={inventory}",
  "inventory={inventoryData.items}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AccountingPage');

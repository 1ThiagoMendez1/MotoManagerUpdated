const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/InventoryClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `<ExportLowStockButton />
          <ExportInventoryButton />`;

const newCode = `<ExportLowStockButton inventory={inventory} />
          <ExportInventoryButton inventory={inventory} />`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Export button props');

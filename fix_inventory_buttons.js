const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/inventory/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Import it
content = content.replace(
  "import { EditInventoryItem } from '@/components/forms/EditInventoryItem';",
  "import { EditInventoryItem } from '@/components/forms/EditInventoryItem';\nimport { TransferStockDialog } from '@/components/forms/TransferStockDialog';"
);

// Add button
content = content.replace(
  "<EditInventoryItem item={item} />",
  "<TransferStockDialog item={item} />\n                          <EditInventoryItem item={item} />"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added Transfer button');

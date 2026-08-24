const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { getInventory } from '@/lib/data';",
  "import { getInventory, getPurchases } from '@/lib/data';"
);

content = content.replace(
  "  const inventoryData = await getInventory({ limit: 1000 } as any);",
  "  const inventoryData = await getInventory({ limit: 1000 } as any);\n  const purchases = await getPurchases(workshop?.id || '');"
);

content = content.replace(
  "inventory={inventoryData.items} />;",
  "inventory={inventoryData.items} purchases={purchases} />;"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AccountingPage to pass purchases');

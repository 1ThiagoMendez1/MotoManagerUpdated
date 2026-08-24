const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/AccountingClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add AddPurchase import
content = content.replace(
  "import { DailyClosingDashboard } from '@/components/dashboard/DailyClosingDashboard';",
  "import { DailyClosingDashboard } from '@/components/dashboard/DailyClosingDashboard';\nimport { AddPurchase } from '@/components/forms/AddPurchase';\nimport type { InventoryItem } from '@/lib/types';"
);

// 2. Add inventory to props
content = content.replace(
  "  organizationId: string;\n}",
  "  organizationId: string;\n  inventory: InventoryItem[];\n}"
);

// 3. Add inventory to component args
content = content.replace(
  "export default function AccountingClient({ subscriptionPlan, organizationId }: AccountingClientProps) {",
  "export default function AccountingClient({ subscriptionPlan, organizationId, inventory }: AccountingClientProps) {"
);

// 4. Replace the alert button with the AddPurchase component
content = content.replace(
  /<Button onClick=\{\(\) => alert\('Próximamente: Abrir modal de nueva compra'\)\}>[\s\S]*?<\/Button>/,
  "<AddPurchase inventory={inventory} />"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched AccountingClient props');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { authorize, getWorkshopDetails } from '@/lib/auth-server';",
  "import { authorize, getWorkshopDetails } from '@/lib/auth-server';\nimport { getInventory } from '@/lib/data';"
);

content = content.replace(
  "  const workshop = await getWorkshopDetails();",
  "  const workshop = await getWorkshopDetails();\n  const inventory = await getInventory(workshop?.id || '');"
);

content = content.replace(
  "  return <AccountingClient subscriptionPlan={workshop?.subscription_plan} organizationId={workshop?.id || ''} />;",
  "  return <AccountingClient subscriptionPlan={workshop?.subscription_plan} organizationId={workshop?.id || ''} inventory={inventory} />;"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched AccountingPage');

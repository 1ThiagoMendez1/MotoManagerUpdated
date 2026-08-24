const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/accounting/AccountingClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { AddPurchase } from "@/components/forms/AddPurchase";\n\'use client\';\n',
  '\'use client\';\nimport { AddPurchase } from "@/components/forms/AddPurchase";\n'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed use client directive');

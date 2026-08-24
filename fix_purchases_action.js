const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/actions/purchases.ts');
let content = fs.readFileSync(filePath, 'utf8');

const badCode = `      organization_id: user.workshopId,
      supplier_id: data.supplierId || null,
      invoice_number: data.invoiceNumber || null,`;

const goodCode = `      organization_id: user.workshopId,
      supplier_id: (data.supplierId && data.supplierId.length === 36) ? data.supplierId : null,
      invoice_number: data.invoiceNumber || null,`;

content = content.replace(badCode, goodCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed purchases action');

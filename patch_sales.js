const fs = require('fs');

const path = 'src/lib/actions/sales.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const total = subtotal - discountAmount;/;
const match = code.match(regex);

if (match) {
  // We need to subtract depositAmount from total, because the deposit was already registered as a separate sale for cash flow.
  const newCode = `const total = Math.max(0, subtotal - discountAmount - (data.depositAmount || 0));`;
  code = code.replace(match[0], newCode);
  fs.writeFileSync(path, code);
  console.log('sales.ts updated successfully');
} else {
  console.log('Regex match failed');
}

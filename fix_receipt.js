const fs = require('fs');
const path = 'src/lib/actions/sales.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /remainingBalance:\s*parsedDeposit\s*>\s*0\s*\?\s*Math\.max\(0,\s*total\s*-\s*parsedDeposit\)\s*:\s*undefined,/;
const match = code.match(regex);

if (match) {
  // `total` already has the deposit deducted. The remaining balance IS the total.
  // We can just keep remainingBalance as `total` or just leave it out, but let's just make it `total`.
  const newCode = `remainingBalance: parsedDeposit > 0 ? total : undefined,`;
  code = code.replace(match[0], newCode);
  fs.writeFileSync(path, code);
  console.log('receipt fixed');
} else {
  console.log('regex failed for remainingBalance');
}

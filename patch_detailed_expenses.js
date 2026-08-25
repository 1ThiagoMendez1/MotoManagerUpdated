const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

content = content.replace(
  "detailedExpenses: { id: string; category: string; description: string; amount: number }[];",
  "detailedExpenses: { id: string; category: string; description: string; amount: number; payment_method: string }[];"
);

content = content.replace(
  /amount: Number\(e\.amount\)\s*\}\)\) \|\| \[\]/,
  "amount: Number(e.amount),\n      payment_method: e.payment_method || 'Efectivo'\n    })) || []"
);

fs.writeFileSync('src/actions/accounting.ts', content);

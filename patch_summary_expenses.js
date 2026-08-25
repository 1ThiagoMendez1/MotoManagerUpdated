const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

// Add payment_method to detailedExpenses
content = content.replace(
  /detailedExpenses: \{ id: string; category: string; description: string; amount: number \} \[\];/,
  "detailedExpenses: { id: string; category: string; description: string; amount: number; payment_method: string; }[];"
);

// In getDailyClosingSummary, fetch payment_method
content = content.replace(
  /\.select\('\*'\)/g,
  ".select('*')" // if there's any, probably it uses * already
);
content = content.replace(
  /detailedExpenses:\s*expenses\?\.map\(\(e: any\) => \(\{[\s\S]*?amount: Number\(e\.amount\)[\s\S]*?\}\)\) \|\| \[\]/,
  `detailedExpenses: expenses?.map((e: any) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      payment_method: e.payment_method || 'Efectivo'
    })) || []`
);

fs.writeFileSync('src/actions/accounting.ts', content);

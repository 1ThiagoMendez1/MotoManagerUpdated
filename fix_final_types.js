const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

// Fix pendingOrdersCount
content = content.replace(
  "pendingOrdersCount,",
  "pendingOrdersCount: pendingOrdersCount || 0,"
);

// Fix detailedExpenses
const oldDetailedExpenses = `  const detailedExpenses = expenses.map(exp => ({
    id: exp.id,
    category: exp.category,
    description: exp.description,
    amount: Number(exp.amount)
  }));`;

const newDetailedExpenses = `  const detailedExpenses = expenses.map(exp => ({
    id: exp.id,
    category: exp.category,
    description: exp.description,
    amount: Number(exp.amount),
    payment_method: exp.payment_method || 'Efectivo'
  }));`;

content = content.replace(oldDetailedExpenses, newDetailedExpenses);

fs.writeFileSync('src/actions/accounting.ts', content);

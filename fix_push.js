const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

const oldPush = `detailedExpenses.push({
        id: payment.id,
        category: cat,
        description: \`Pago de comisiones a \${techName}\`,
        amount: amount
      });`;

const newPush = `detailedExpenses.push({
        id: payment.id,
        category: cat,
        description: \`Pago de comisiones a \${techName}\`,
        amount: amount,
        payment_method: 'Efectivo'
      });`;

content = content.replace(oldPush, newPush);
fs.writeFileSync('src/actions/accounting.ts', content);

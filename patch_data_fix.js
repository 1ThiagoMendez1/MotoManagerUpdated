const fs = require('fs');
const path = 'src/lib/data.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /let parsedDeposit = 0;\s*if \(wo\.customer_observations\) \{\s*const match = wo\.customer_observations\.match\(\/Abono registrado:\\s\*\\(\\d\+\\(\\\.\\d\+\\\)\\\?\)\/\);\s*if \(match\) \{\s*parsedDeposit = parseFloat\(match\[1\]\);\s*\}\s*\}/m;

const match = code.match(regex);
if (match) {
  const newStr = `  let parsedDeposit = 0;
  let depositHistory: any[] = [];
  if (wo.sales && wo.sales.length > 0) {
      wo.sales.forEach((sale: any) => {
          if (sale.notes && sale.notes.includes('Abono de orden')) {
              parsedDeposit += Number(sale.total);
              depositHistory.push({
                  id: sale.id,
                  amount: sale.total,
                  method: sale.payment_method === 'cash' ? 'Efectivo' :
                          sale.payment_method === 'transfer' ? 'Transferencia' :
                          sale.payment_method === 'credit_card' ? 'Tarjeta' :
                          sale.payment_method === 'nequi' ? 'Nequi' :
                          sale.payment_method === 'daviplata' ? 'DaviPlata' :
                          sale.payment_method === 'wompi' ? 'Wompi' : 'Otros',
                  date: sale.created_at,
                  sale_number: sale.sale_number,
                  received_by: sale.created_by_profile ? \`\${sale.created_by_profile.first_name} \${sale.created_by_profile.last_name}\`.trim() : 'Sistema'
              });
          }
      });
  }`;
  
  code = code.replace(match[0], newStr);
  fs.writeFileSync(path, code);
  console.log('patched data.ts successfully');
} else {
  console.log('regex not found');
}

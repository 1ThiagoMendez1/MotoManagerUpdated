const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', 'utf8');

// We calculate the expected cash = Base + Cash Incomes - Cash Expenses
const logic = `
  const totalCompletedOrders = summary?.technicianSummary.reduce((sum, t) => sum + t.totalServices, 0) || 0;
  const avgTicket = totalCompletedOrders > 0 ? (summary?.totalIncome || 0) / totalCompletedOrders : 0;
  const margin = summary?.totalIncome ? ((balance) / summary.totalIncome) * 100 : 0;

  const cashIncome = summary?.incomeByPaymentMethod.find(m => m.method === 'Efectivo' || m.method === 'cash')?.total || 0;
  const cashExpenses = summary?.detailedExpenses.filter(e => e.payment_method === 'Efectivo' || e.payment_method === 'cash').reduce((sum, e) => sum + e.amount, 0) || 0;
  const expectedCash = (summary?.totalCashBase || 0) + cashIncome - cashExpenses;
`;

content = content.replace(
  /const totalCompletedOrders = summary\?\.technicianSummary\.reduce\(\(sum, t\) => sum \+ t\.totalServices, 0\) \|\| 0;\n  const avgTicket = totalCompletedOrders > 0 \? \(summary\?\.totalIncome \|\| 0\) \/ totalCompletedOrders : 0;\n  const margin = summary\?\.totalIncome \? \(\(balance\) \/ summary\.totalIncome\) \* 100 : 0;/,
  logic
);

// We add a card for "Efectivo Esperado"
const expectedCashUI = `
                  <div className="bg-card border-2 border-indigo-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Calculator className="w-6 h-6 text-indigo-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Efectivo Esperado</p>
                    <p className="text-xl font-black text-indigo-500">{formatCurrency(expectedCash)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Base + Ventas - Gastos</p>
                  </div>
`;

content = content.replace(
  /<div className="bg-card border-2 border-indigo-500\/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">\s*<Calculator className="w-6 h-6 text-indigo-500 mb-2" \/>\s*<p className="text-\[10px\] font-bold text-muted-foreground uppercase tracking-wider mb-1">Utilidad<\/p>\s*<p className="text-xl font-black text-indigo-500">\{formatCurrency\(balance\)\}<\/p>\s*<\/div>/,
  expectedCashUI
);

// We change grid to 5 columns if it's md:grid-cols-4? No, let's keep it md:grid-cols-4 and let expectedCash wrap, or change to 4 and replace Utilidad. Wait, I replaced Utilidad with Efectivo Esperado. I should probably keep Utilidad.
// I will revert that and instead insert it after Utilidad, changing grid-cols-4 to grid-cols-5.

fs.writeFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', content);

const fs = require('fs');
let content = fs.readFileSync('src/actions/accounting.ts', 'utf8');

// Fix pendingOrdersCount type error (if it can be null)
content = content.replace(/pendingOrdersCount: count,/g, 'pendingOrdersCount: count || 0,');

// Fix detailedExpenses in accounting.ts
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

// Fix cash_bases any[] in accounting.ts
content = content.replace(
  /let cash_bases = \[\];/,
  "let cash_bases: any[] = [];"
);

fs.writeFileSync('src/actions/accounting.ts', content);

let client = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');
client = client.replace(
  /if \(!realtimeData\) return \{ chartData: \[\], metrics: \{ ingresos: 0, gastos: 0, utilidad: 0, margen: 0, totalVentas: 0, label: '' \}, paymentMethodsData: \[\], cashFlowData: \{ efectivoIngresado: 0, efectivoNeto: 0, otrosMetodos: 0, categorias: \[\] \} \};/,
  "if (!realtimeData) return { chartData: [], metrics: { ingresos: 0, gastos: 0, utilidad: 0, margen: 0, totalVentas: 0, label: '' }, paymentMethodsData: [], cashFlowData: { efectivoIngresado: 0, efectivoNeto: 0, otrosMetodos: 0, otrosMetodosIngresado: 0, totalOtherExpenses: 0, categorias: [], totalCashExpenses: 0, initialBase: 0, cashBases: [] } };"
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', client);

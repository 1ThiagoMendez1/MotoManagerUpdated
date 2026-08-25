const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

const replaceStr = `
    const otrosMetodosIngresado = paymentMethodsData.filter(p => p.method !== 'Efectivo').reduce((sum, p) => sum + p.amount, 0);
    const totalOtherExpenses = totalEgresos - totalCashExpenses;
    const otrosMetodosNeto = otrosMetodosIngresado - totalOtherExpenses;

    const cashFlowData = {
      efectivoIngresado,
      efectivoNeto,
      otrosMetodos: otrosMetodosNeto,
      otrosMetodosIngresado,
      totalOtherExpenses,
      categorias: Object.keys(categoriesMap).map(k => ({ category: k, amount: categoriesMap[k] })).sort((a,b) => b.amount - a.amount),
      totalCashExpenses,
      initialBase
    };
`;

content = content.replace(
  /const cashFlowData = \{[\s\S]*?initialBase\n    \};/,
  replaceStr.trim()
);

// update UI for otros métodos
const newUI = `
                  {/* OTROS MÉTODOS */}
                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bancos / Otros Métodos (Neto)</CardTitle>
                      <CardDescription>Transferencias, tarjetas menos gastos por banco</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={\`text-3xl font-bold \${cashFlowData.otrosMetodos >= 0 ? 'text-indigo-500' : 'text-rose-500'}\`}>
                        {formatCurrency(cashFlowData.otrosMetodos)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ingresos banco: {formatCurrency(cashFlowData.otrosMetodosIngresado)} <br/>
                        Gastos deducidos: {formatCurrency(cashFlowData.totalOtherExpenses)}
                      </p>
                    </CardContent>
                  </Card>
`;

content = content.replace(
  /\{\/\* OTROS MÉTODOS \*\/\}[\s\S]*?<\/CardContent>\s*<\/Card>/,
  newUI.trim()
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);

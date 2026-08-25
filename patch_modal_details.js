const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', 'utf8');

const detailUI = `
                {/* DETALLE EFECTIVO */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Detalle de Efectivo en Caja
                  </h4>
                  <div className="space-y-2 text-sm bg-muted/10 p-4 rounded-xl border border-border/50">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Base Inicial Acumulada</span>
                      <span className="font-medium text-foreground">{formatCurrency(summary.totalCashBase)}</span>
                    </div>
                    {summary.cashBases?.map((b: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs pl-4 border-l-2 border-border/50">
                        <span className="text-muted-foreground">- {b.description}</span>
                        <span className="text-emerald-500">+{formatCurrency(b.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Ventas en Efectivo</span>
                      <span className="font-medium text-emerald-500">+{formatCurrency(cashIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Gastos en Efectivo</span>
                      <span className="font-medium text-rose-500">-{formatCurrency(cashExpenses)}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2 flex justify-between items-center font-bold text-base">
                      <span>Efectivo Total Esperado</span>
                      <span className="text-indigo-500">{formatCurrency(expectedCash)}</span>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST */}
`;

content = content.replace(
  /\{\/\* CHECKLIST \*\/\}/,
  detailUI
);

fs.writeFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', content);

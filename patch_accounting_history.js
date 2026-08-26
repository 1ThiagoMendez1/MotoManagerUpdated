const fs = require('fs');
const path = 'src/app/accounting/AccountingClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add history arrays calculation before cashFlowData creation
const calculateHistoryCode = `
    const cashHistory: { label: string, amount: number, method: string }[] = [];
    const bankHistory: { label: string, amount: number, method: string }[] = [];
    
    realtimeData.sales.forEach(s => {
       const isAbono = s.notes && s.notes.includes('Abono de orden');
       let label = s.sale_number || 'Venta';
       if (isAbono) {
           label = s.sale_number + (s.notes ? ' (' + s.notes.split('-').pop().trim() + ')' : '');
       }
       
       const uiMethod = s.payment_method === 'cash' ? 'Efectivo' :
                        s.payment_method === 'transfer' ? 'Transferencia' :
                        s.payment_method === 'credit_card' ? 'Tarjeta' :
                        s.payment_method === 'nequi' ? 'Nequi' :
                        s.payment_method === 'daviplata' ? 'DaviPlata' : 'Otros';

       const amount = Number(s.total) || 0;
       if (amount > 0) {
           if (uiMethod === 'Efectivo') {
               cashHistory.push({ label, amount, method: uiMethod });
           } else {
               bankHistory.push({ label, amount, method: uiMethod });
           }
       }
    });

    const cashFlowData = {`;

code = code.replace("const cashFlowData = {", calculateHistoryCode);

// 2. Add them to cashFlowData object
code = code.replace("cashBases: realtimeData.cash_bases || []", "cashBases: realtimeData.cash_bases || [], cashHistory, bankHistory");

// 3. Render in UI for Efectivo
const uiCashCode = `{cashFlowData.cashHistory && cashFlowData.cashHistory.length > 0 && (
                        <div className="mt-4 space-y-1 pt-4 border-t border-border/50">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Historial de Ingresos</p>
                          {cashFlowData.cashHistory.map((h: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">+ {h.label}</span>
                              <span className="font-medium text-emerald-500">{formatCurrency(h.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}`;

code = code.replace("{periodFilter === 'day' && (", uiCashCode + "\n                      {periodFilter === 'day' && (");

// 4. Render in UI for Bancos
const uiBankCode = `{cashFlowData.bankHistory && cashFlowData.bankHistory.length > 0 && (
                        <div className="mt-4 space-y-1 pt-4 border-t border-border/50">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Historial de Ingresos Bancarios</p>
                          {cashFlowData.bankHistory.map((h: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground truncate max-w-[150px]">+ {h.label} ({h.method})</span>
                              <span className="font-medium text-indigo-500">{formatCurrency(h.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}`;
                      
const searchString = "Gastos deducidos: {formatCurrency(cashFlowData.totalOtherExpenses)}\n                      </p>";
code = code.replace(searchString, searchString + "\n                      " + uiBankCode);

fs.writeFileSync(path, code);
console.log('AccountingClient patched successfully');

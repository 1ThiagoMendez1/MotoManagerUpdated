const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

const baseUI = `
                      <p className="text-xs text-muted-foreground mt-2">
                        Base inicial: {formatCurrency(cashFlowData.initialBase)} <br/>
                        Ingresos efectivo: {formatCurrency(cashFlowData.efectivoIngresado)} <br/>
                        Gastos deducidos: {formatCurrency(cashFlowData.totalCashExpenses)}
                      </p>
                      
                      {periodFilter === 'day' && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <label className="text-xs font-medium text-foreground mb-1 block">Actualizar Base de Caja (Hoy)</label>
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                              placeholder="Ej. 100000"
                              value={baseInput}
                              onChange={e => setBaseInput(e.target.value)}
                            />
                            <Button 
                              size="sm" 
                              onClick={handleSetBase} 
                              disabled={isSettingBase}
                            >
                              Guardar
                            </Button>
                          </div>
                        </div>
                      )}
`;

content = content.replace(
  /<p className="text-xs text-muted-foreground mt-2">\s*Ingresos efectivo.*?\s*Gastos deducidos.*?\s*<\/p>/,
  baseUI
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);

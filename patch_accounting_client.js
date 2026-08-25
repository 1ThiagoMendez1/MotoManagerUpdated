const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

// 1. Add baseMotivo state
content = content.replace(
  "const [baseInput, setBaseInput] = useState('');\n  const [isSettingBase, setIsSettingBase] = useState(false);",
  "const [baseInput, setBaseInput] = useState('');\n  const [baseMotivo, setBaseMotivo] = useState('');\n  const [isSettingBase, setIsSettingBase] = useState(false);"
);

// 2. Update handleSetBase to send baseMotivo
const newHandleSetBase = `
  const handleSetBase = async () => {
    if (!baseInput || isNaN(Number(baseInput))) {
      toast.error('Ingrese un valor válido para la base');
      return;
    }
    
    setIsSettingBase(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localDate = now.toISOString().split('T')[0];
      await setInitialCashBase(organizationId, localDate, Number(baseInput), baseMotivo || 'Apertura', 'addition');
      toast.success('Base de caja registrada');
      setBaseInput('');
      setBaseMotivo('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar base');
    } finally {
      setIsSettingBase(false);
    }
  };
`;

content = content.replace(
  /const handleSetBase = async \(\) => \{[\s\S]*?setIsSettingBase\(false\);\n    \}\n  \};/,
  newHandleSetBase.trim()
);

// 3. Update cashFlowData to pass the full cash_bases array
content = content.replace(
  /initialBase\n    \};/,
  `initialBase,\n      cashBases: realtimeData.cash_bases || []\n    };`
);

// 4. Update the UI to show the movements and the motivo input
const newUI = `
                      <p className="text-xs text-muted-foreground mt-2">
                        Total en Base: <span className="font-semibold text-foreground">{formatCurrency(cashFlowData.initialBase)}</span> <br/>
                        Ingresos efectivo: {formatCurrency(cashFlowData.efectivoIngresado)} <br/>
                        Gastos deducidos: {formatCurrency(cashFlowData.totalCashExpenses)}
                      </p>
                      
                      {cashFlowData.cashBases && cashFlowData.cashBases.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Historial de Base Hoy</p>
                          {cashFlowData.cashBases.map((b: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">- {b.description || 'Adición'}</span>
                              <span className="font-medium text-emerald-500">{formatCurrency(Number(b.amount))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {periodFilter === 'day' && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <label className="text-xs font-medium text-foreground mb-1 block">Añadir a Base de Caja (Hoy)</label>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="number" 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                              placeholder="Monto (Ej. 100000)"
                              value={baseInput}
                              onChange={e => setBaseInput(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                                placeholder="Motivo (Ej. Apertura, Sencillo)"
                                value={baseMotivo}
                                onChange={e => setBaseMotivo(e.target.value)}
                              />
                              <Button 
                                size="sm" 
                                onClick={handleSetBase} 
                                disabled={isSettingBase}
                              >
                                {isSettingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Añadir'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
`;

content = content.replace(
  /<p className="text-xs text-muted-foreground mt-2">\s*Base inicial:[\s\S]*?<\/Button>\s*<\/div>\s*<\/div>\s*\)}/,
  newUI.trim()
);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);

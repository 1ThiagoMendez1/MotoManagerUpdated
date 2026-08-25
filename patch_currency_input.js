const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

// 1. Update handleSetBase logic
const oldHandleSetBaseRegex = /const handleSetBase = async \(motivo: string\) => \{[\s\S]*?setIsSettingBase\(false\);\n    \}\n  \};/;
const newHandleSetBase = `  const handleSetBase = async (motivo: string) => {
    const rawAmount = Number(baseInput.replace(/\\D/g, ''));
    if (!rawAmount || isNaN(rawAmount)) {
      toast.error('Ingrese un valor válido para la base');
      return;
    }
    
    setIsSettingBase(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localDate = now.toISOString().split('T')[0];
      await setInitialCashBase(organizationId, localDate, rawAmount, motivo, 'addition');
      toast.success('Movimiento de caja registrado');
      setBaseInput('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar base');
    } finally {
      setIsSettingBase(false);
    }
  };`;

content = content.replace(oldHandleSetBaseRegex, newHandleSetBase);


// 2. Update the input element
const oldInputRegex = /<input \s*type="number" \s*className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" \s*placeholder="Monto \(Ej\. 100000\)"\s*value=\{baseInput\}\s*onChange=\{e => setBaseInput\(e\.target\.value\)\}\s*\/>/;

const newInput = `<input 
                              type="text" 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                              placeholder="Monto (Ej. $ 100.000)"
                              value={baseInput}
                              onChange={e => {
                                const rawValue = e.target.value.replace(/\\D/g, '');
                                if (!rawValue) {
                                  setBaseInput('');
                                  return;
                                }
                                const formatted = new Intl.NumberFormat('es-CO', {
                                  style: 'currency',
                                  currency: 'COP',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(Number(rawValue));
                                setBaseInput(formatted);
                              }}
                            />`;

content = content.replace(oldInputRegex, newInput);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);

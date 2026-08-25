const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/AccountingClient.tsx', 'utf8');

// 1. Update handleSetBase to accept motivo as a parameter
const oldHandleSetBaseRegex = /const handleSetBase = async \(\) => \{[\s\S]*?setIsSettingBase\(false\);\n    \}\n  \};/;
const newHandleSetBase = `  const handleSetBase = async (motivo: string) => {
    if (!baseInput || isNaN(Number(baseInput))) {
      toast.error('Ingrese un valor válido para la base');
      return;
    }
    
    setIsSettingBase(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localDate = now.toISOString().split('T')[0];
      await setInitialCashBase(organizationId, localDate, Number(baseInput), motivo, 'addition');
      toast.success('Movimiento de caja registrado');
      setBaseInput('');
      // setBaseMotivo is removed
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar base');
    } finally {
      setIsSettingBase(false);
    }
  };`;

content = content.replace(oldHandleSetBaseRegex, newHandleSetBase);

// 2. Remove baseMotivo state
content = content.replace(
  "const [baseMotivo, setBaseMotivo] = useState('');\n",
  ""
);

// 3. Update the UI to have two buttons instead of a text input + one button
const oldUI = `<label className="text-xs font-medium text-foreground mb-1 block">Añadir a Base de Caja (Hoy)</label>
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
                          </div>`;

const newUI = `<label className="text-xs font-medium text-foreground mb-1 block">Añadir a Base de Caja (Hoy)</label>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="number" 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                              placeholder="Monto (Ej. 100000)"
                              value={baseInput}
                              onChange={e => setBaseInput(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                className="w-full border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                                onClick={() => handleSetBase('Apertura')} 
                                disabled={isSettingBase}
                              >
                                {isSettingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apertura'}
                              </Button>
                              <Button 
                                size="sm" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleSetBase('Adición')} 
                                disabled={isSettingBase}
                              >
                                {isSettingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sumar'}
                              </Button>
                            </div>
                          </div>`;

content = content.replace(oldUI, newUI);

fs.writeFileSync('src/app/accounting/AccountingClient.tsx', content);

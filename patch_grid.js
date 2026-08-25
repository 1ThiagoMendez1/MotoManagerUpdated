const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', 'utf8');

content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-4 gap-4">/,
  '<div className="grid grid-cols-2 md:grid-cols-5 gap-4">'
);

// Bring back Utilidad card
content = content.replace(
  /Efectivo Esperado<\/p>\s*<p className="text-xl font-black text-indigo-500">\{formatCurrency\(expectedCash\)\}<\/p>\s*<p className="text-\[10px\] text-muted-foreground mt-1">Base \+ Ventas - Gastos<\/p>\s*<\/div>/,
  `Efectivo Esperado</p>
                    <p className="text-xl font-black text-indigo-500">{formatCurrency(expectedCash)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Base + Ventas - Gastos</p>
                  </div>
                  <div className="bg-card border-2 border-indigo-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Calculator className="w-6 h-6 text-indigo-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Utilidad</p>
                    <p className="text-xl font-black text-indigo-500">{formatCurrency(balance)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Ingresos netos</p>
                  </div>`
);

fs.writeFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', content);

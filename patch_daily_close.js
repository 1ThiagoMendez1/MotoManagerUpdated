const fs = require('fs');
let content = fs.readFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', 'utf8');

// 1. Add expenseMethod state
content = content.replace(
  "const [expenseCat, setExpenseCat] = useState(EXPENSE_CATEGORIES[0]);",
  "const [expenseCat, setExpenseCat] = useState(EXPENSE_CATEGORIES[0]);\n  const [expenseMethod, setExpenseMethod] = useState('Efectivo');"
);

// 2. Add payment method to addExpense call
content = content.replace(
  "await addExpense(organizationId, expenseCat, expenseDesc, Number(expenseVal), localDate.toISOString());",
  "await addExpense(organizationId, expenseCat, expenseDesc, Number(expenseVal), localDate.toISOString(), expenseMethod);"
);

// 3. Add Method dropdown in UI
const oldFormFields = `<div className="w-full sm:w-1/3 space-y-1.5">
                        <Label className="text-xs">Categoría</Label>`;

const newFormFields = `
                      <div className="w-full sm:w-1/4 space-y-1.5">
                        <Label className="text-xs">Categoría</Label>
                        <Select value={expenseCat} onValueChange={setExpenseCat}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-full sm:w-1/4 space-y-1.5">
                        <Label className="text-xs">Método Pago</Label>
                        <Select value={expenseMethod} onValueChange={setExpenseMethod}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                            <SelectItem value="Nequi">Nequi</SelectItem>
                            <SelectItem value="DaviPlata">DaviPlata</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full sm:w-1/4 space-y-1.5">
                        <Label className="text-xs">Descripción</Label>
`;

content = content.replace(
  /<div className="w-full sm:w-1\/3 space-y-1\.5">\s*<Label className="text-xs">Categoría<\/Label>[\s\S]*?<div className="w-full sm:w-1\/3 space-y-1\.5">\s*<Label className="text-xs">Descripción<\/Label>/,
  newFormFields
);

// replace the last 1/3 with 1/4 for value
content = content.replace(
  /<div className="w-full sm:w-1\/3 space-y-1\.5">\s*<Label className="text-xs">Valor \(Pesos\)<\/Label>/,
  `<div className="w-full sm:w-1/4 space-y-1.5">
                        <Label className="text-xs">Valor (Pesos)</Label>`
);

fs.writeFileSync('src/app/accounting/components/DailyClosingDashboard.tsx', content);

const fs = require('fs');
const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const searchRegex = /let currentObs = woData\?\.customer_observations \|\| '';[\s\S]*?const totalAbono = mode === 'set' \? amount : \(currentAbono \+ amount\);/m;
const newCode = `    // Query current abonos directly from sales
    const { data: depositSales } = await supabase
        .from('sales')
        .select('total')
        .eq('work_order_id', workOrderId)
        .ilike('notes', 'Abono de orden%');
        
    let currentAbono = 0;
    if (depositSales) {
        currentAbono = depositSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    }
    
    const amountToAdd = mode === 'set' ? (amount - currentAbono) : amount;
`;

if (code.match(searchRegex)) {
    code = code.replace(searchRegex, newCode);
    fs.writeFileSync(path, code);
    console.log('patched sum successfully');
} else {
    console.log('search string not found');
}

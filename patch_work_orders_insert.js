const fs = require('fs');
const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const amountToAdd = mode === 'set' \? \(amount - currentAbono\) : amount;[\s\S]*?if \(existingSale\) \{[\s\S]*?\} else if \(totalAbono > 0\) \{/m;
const match = code.match(regex);

if (match) {
    const newCode = `const amountToAdd = mode === 'set' ? (amount - currentAbono) : amount;
    const totalAbono = mode === 'set' ? amount : (currentAbono + amount);
    
    // Manage cash flow entry for the deposit
    if (amountToAdd !== 0) {
        // Map payment method
        let dbPaymentMethod = 'cash';
        if (paymentMethod === 'Tarjeta') dbPaymentMethod = 'credit_card';
        if (paymentMethod === 'Nequi') dbPaymentMethod = 'nequi';
        if (paymentMethod === 'DaviPlata') dbPaymentMethod = 'daviplata';
        if (paymentMethod === 'Transferencia') dbPaymentMethod = 'transfer';
        if (paymentMethod === 'Otros') dbPaymentMethod = 'other';
        
        // ALWAYS insert a new sale record for the amountToAdd (to maintain independent history)
        if (amountToAdd !== 0) {
`;
    code = code.replace(match[0], newCode);
    
    // We also need to fix the sale_number generation so it's unique
    const saleNumberRegex = /sale_number: \`AB-\$\{woData\?.order_number\}\`,/;
    code = code.replace(saleNumberRegex, "sale_number: `AB-${woData?.order_number}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`,");
    
    // Fix subtotal and total to be amountToAdd instead of totalAbono
    code = code.replace("subtotal: totalAbono,", "subtotal: amountToAdd,");
    code = code.replace("total: totalAbono,", "total: amountToAdd,");
    
    fs.writeFileSync(path, code);
    console.log('patched work-orders.ts successfully');
} else {
    console.log('regex failed');
}

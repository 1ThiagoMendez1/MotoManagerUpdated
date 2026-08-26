const fs = require('fs');
const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /const amountToAdd = mode === 'set' \? \(amount - currentAbono\) : amount;\n\s*\n\s*\/\/ Manage cash flow entry for the deposit/m;
const match = code.match(regex);

if (match) {
    const newCode = `const amountToAdd = mode === 'set' ? (amount - currentAbono) : amount;
    
    // RESTORE THE CUSTOMER OBSERVATIONS UPDATE FOR COMPATIBILITY
    const totalAbono = currentAbono + amountToAdd;
    let currentObs = woData?.customer_observations || '';
    currentObs = currentObs.replace(/Abono registrado:\\s*(\\d+(\\.\\d+)?)\\s*/, '').trim();
    
    const newObs = totalAbono > 0 
        ? \`Abono registrado: \${totalAbono}\${currentObs ? '\\n' + currentObs : ''}\` 
        : currentObs;

    await supabase
        .from('work_orders')
        .update({ customer_observations: newObs })
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId);

    // Manage cash flow entry for the deposit`;
    
    code = code.replace(match[0], newCode);
    fs.writeFileSync(path, code);
    console.log('patched restore obs successfully');
} else {
    console.log('regex failed');
}

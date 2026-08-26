const fs = require('fs');

const path = 'src/lib/actions/work-orders.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /export async function addDepositToWorkOrder\(formData: FormData\) \{([\s\S]*?)revalidatePath\('\/work-orders\/' \+ workOrderId\);\n\}/;
const match = code.match(regex);

if (match) {
  const newFunc = `export async function addDepositToWorkOrder(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const mode = formData.get('mode') as string || 'add';
    const paymentMethod = formData.get('paymentMethod') as string || 'Efectivo';

    if (!workOrderId || isNaN(amount) || amount < 0) {
        throw new Error('Datos inválidos');
    }

    // Obtener las observaciones actuales para sumar el abono
    const { data: woData } = await supabase
        .from('work_orders')
        .select('customer_observations, order_number, motorcycle_id')
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId)
        .single();

    let currentObs = woData?.customer_observations || '';
    let currentAbono = 0;
    const abonoMatch = currentObs.match(/Abono registrado:\\s*(\\d+(\\.\\d+)?)/);
    
    if (abonoMatch) {
        currentAbono = parseFloat(abonoMatch[1]);
        currentObs = currentObs.replace(/Abono registrado:\\s*(\\d+(\\.\\d+)?)\\s*/, '').trim();
    }
    
    const amountToAdd = mode === 'set' ? (amount - currentAbono) : amount;
    const totalAbono = mode === 'set' ? amount : (currentAbono + amount);
    
    const newObs = totalAbono > 0 
        ? \`Abono registrado: \${totalAbono}\${currentObs ? '\\n' + currentObs : ''}\` 
        : currentObs; // Si es 0, simplemente lo quitamos

    const { error } = await supabase
        .from('work_orders')
        .update({ customer_observations: newObs })
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId);

    if (error) throw new Error('Error al actualizar abono');
    
    // Manage cash flow entry for the deposit
    if (amountToAdd !== 0) {
        // Map payment method
        let dbPaymentMethod = 'cash';
        if (paymentMethod === 'Tarjeta') dbPaymentMethod = 'credit_card';
        if (paymentMethod === 'Nequi') dbPaymentMethod = 'nequi';
        if (paymentMethod === 'DaviPlata') dbPaymentMethod = 'daviplata';
        if (paymentMethod === 'Transferencia') dbPaymentMethod = 'transfer';
        if (paymentMethod === 'Otros') dbPaymentMethod = 'other';
        if (paymentMethod === 'Wompi') dbPaymentMethod = 'wompi';
        
        // Find existing deposit sale
        const { data: existingSale } = await supabase
            .from('sales')
            .select('id')
            .eq('work_order_id', workOrderId)
            .ilike('notes', 'Abono de orden%')
            .maybeSingle();
            
        if (existingSale) {
            if (totalAbono === 0) {
                await supabase.from('sales').delete().eq('id', existingSale.id);
            } else {
                await supabase.from('sales').update({
                    total: totalAbono,
                    subtotal: totalAbono,
                    payment_method: dbPaymentMethod
                }).eq('id', existingSale.id);
                
                // update sale_item
                await supabase.from('sale_items').update({
                    total: totalAbono,
                    unit_price: totalAbono
                }).eq('sale_id', existingSale.id);
            }
        } else if (totalAbono > 0) {
            // Get motorcycle for plate mapping
            const { data: motoData } = await supabase
                .from('motorcycles')
                .select('license_plate')
                .eq('id', woData?.motorcycle_id)
                .single();
            const plate = motoData?.license_plate || 'S/N';
            
            // Create a new sale for the deposit
            const { data: newSale } = await supabase.from('sales').insert({
                organization_id: user.workshopId,
                work_order_id: workOrderId,
                sale_number: \`AB-\${woData?.order_number}\`,
                subtotal: totalAbono,
                total: totalAbono,
                payment_method: dbPaymentMethod,
                status: 'paid',
                notes: \`Abono de orden #\${woData?.order_number} - \${plate}\`
            }).select().single();
            
            if (newSale) {
                await supabase.from('sale_items').insert({
                    sale_id: newSale.id,
                    item_type: 'service',
                    description: 'Abono de Orden',
                    quantity: 1,
                    unit_price: totalAbono,
                    total: totalAbono
                });
            }
        }
    }

    revalidatePath('/work-orders/' + workOrderId);
}`;

  code = code.replace(match[0], newFunc);
  fs.writeFileSync(path, code);
  console.log('work-orders.ts updated successfully');
} else {
  console.log('Regex match failed');
}

'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendServiceSaleNotification, sendSaleNotification, sendVentaPorOrdenNotification, sendDirectSalePaidNotification, checkAndUpdateWhatsAppLimit } from '@/lib/whatsapp';
import { createAdminClient } from '@/lib/supabase/admin';

// --- Schemas ---

const serviceSaleSchema = z.object({
    workOrderId: z.string().min(1, 'Se requiere la orden de trabajo.'),
    laborCost: z.coerce.number().min(0, "El costo no puede ser negativo."),
    paymentMethod: z.enum(['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros'], {
        required_error: "Se requiere seleccionar un medio de pago.",
    }),
    date: z.string({
        required_error: "Se requiere una fecha.",
    }),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, "Selecciona un producto"),
        quantity: z.coerce.number().int().min(1, "Mínimo 1"),
        price: z.coerce.number(),
        fromWorkOrder: z.boolean().optional(),
        type: z.string().optional(),
        name: z.string().optional(),
        sku: z.string().optional(),
    })).optional(),
    discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
    depositAmount: z.coerce.number().min(0).optional(),
});

const directSaleSchema = z.object({
    customerId: z.string().optional(),
    cedula: z.string().optional(),
    customerName: z.string().optional(),
    phone: z.string().optional(),
    paymentMethod: z.enum(['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros'], {
        required_error: "Se requiere seleccionar un medio de pago.",
    }),
    date: z.string({ required_error: "Se requiere una fecha." }),
    items: z.array(z.object({
        inventoryItemId: z.string().optional(),
        type: z.string().optional(),
        name: z.string().optional(),
        quantity: z.coerce.number().int().min(1, "Mínimo 1"),
        price: z.coerce.number(),
    })).min(1, "Agrega al menos un producto o servicio."),
    discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

// --- Helper Functions ---

function mapPaymentMethodToDb(uiMethod: string) {
    if (uiMethod === 'Efectivo') return 'cash';
    if (uiMethod === 'Tarjeta') return 'credit_card';
    if (uiMethod === 'Nequi' || uiMethod === 'DaviPlata' || uiMethod === 'transfer' || uiMethod === 'Transferencia') return 'transfer';
    return 'other'; // Addi, Wompi, Otros
}

function mapPaymentMethodToUi(dbMethod: string) {
    if (dbMethod === 'cash') return 'Efectivo';
    if (dbMethod === 'credit_card' || dbMethod === 'debit_card') return 'Tarjeta';
    if (dbMethod === 'transfer') return 'Transferencia';
    return 'Otros';
}

function splitName(fullName: string) {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';
    return { firstName, lastName };
}

async function generateSaleNumber(supabase: any, organizationId: string, prefix: 'V' | 'VS') {
    // Obtener todas las ventas con este prefijo para encontrar el número máximo real.
    // Ordernar por created_at falla si una orden antigua se completa después de una nueva.
    const { data: sales } = await supabase
        .from('sales')
        .select('sale_number')
        .eq('organization_id', organizationId)
        .ilike('sale_number', `${prefix}%`)
        .limit(10000);

    let maxNumber = 0;
    if (sales && sales.length > 0) {
        for (const sale of sales) {
            if (sale.sale_number) {
                const numStr = sale.sale_number.replace(prefix, '');
                const num = parseInt(numStr);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
    }

    return `${prefix}${maxNumber + 1}`;
}

// --- Actions ---

export async function createServiceSale(prevState: any, formData: FormData) {
    console.log('createServiceSale started');
    const user = await requireWorkshop();
    const supabase = await createClient(); // Cliente real

    // Fetch workshop name for receipt
    const { data: orgData } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();
    const workshopName = orgData?.name || 'MotoManager';

    try {
        const itemsRaw = formData.get('items') as string;
        const items = JSON.parse(itemsRaw || '[]');
        const workOrderId = formData.get('workOrderId') as string;
        const laborCost = parseFloat(formData.get('laborCost') as string);
        const paymentMethod = formData.get('paymentMethod') as string;
        const date = formData.get('date') as string;
        const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0;
        const depositAmount = parseFloat(formData.get('depositAmount') as string) || 0;

        const validatedFields = serviceSaleSchema.safeParse({
            workOrderId,
            laborCost,
            paymentMethod,
            date,
            items,
            discountPercentage,
            depositAmount,
        });

        if (!validatedFields.success) {
            console.error('Validation failed:', validatedFields.error.flatten());
            const firstError = Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] || 'Error de validación.';
            return { 
                success: false, 
                message: `Error de validación: ${firstError}`, 
                errors: validatedFields.error.flatten().fieldErrors 
            };
        }

        const data = validatedFields.data;
        const dbPaymentMethod = mapPaymentMethodToDb(data.paymentMethod);
        const saleNumber = await generateSaleNumber(supabase, user.workshopId, 'VS');

        // 2. Check Inventory (skip items already deducted from approved quote)
        for (const item of data.items || []) {
            if (item.fromWorkOrder) continue;

            const { data: invItem } = await supabase
                .from('inventory_items')
                .select('quantity, name')
                .eq('id', item.inventoryItemId)
                .single();

            if (!invItem || invItem.quantity < item.quantity) {
                return { message: `Stock insuficiente para ${invItem?.name || 'producto'}.` };
            }
        }

        // 3. Calculate Totals
        const productItemsForTotal = (data.items || []).filter(item => item.type !== 'service');
        const itemsTotal = productItemsForTotal.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotal = itemsTotal + data.laborCost;
        const discountAmount = itemsTotal * ((data.discountPercentage || 0) / 100);
        const total = subtotal - discountAmount;

        // 4. Create or Update Sale Record
        // Check if there is already a paid/completed sale for this work order to prevent duplicates
        const { data: alreadyPaid } = await supabase
            .from('sales')
            .select('id')
            .eq('work_order_id', data.workOrderId)
            .eq('organization_id', user.workshopId)
            .neq('status', 'pending')
            .limit(1)
            .maybeSingle();

        if (alreadyPaid) {
            // Auto-sanación: Si ya está pagada pero el usuario pudo abrir el modal,
            // probablemente la orden quedó con estado 'Reparado' (completed) en lugar de 'Entregado' (delivered).
            const supabaseAdmin = createAdminClient();
            await supabaseAdmin.from('work_orders').update({
                status: 'delivered',
                completed_at: new Date().toISOString()
            }).eq('id', data.workOrderId).eq('organization_id', user.workshopId);

            revalidatePath('/sales');
            revalidatePath('/work-orders');
            revalidatePath('/', 'layout');

            return { success: true, message: 'La venta ya estaba registrada correctamente. Se actualizó el estado de la orden.' };
        }

        let sale;
        const { data: existingSale } = await supabase
            .from('sales')
            .select('id')
            .eq('work_order_id', data.workOrderId)
            .eq('organization_id', user.workshopId)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingSale) {
            const { data: updatedSale, error: saleError } = await supabase
                .from('sales')
                .update({
                    sale_number: saleNumber,
                    payment_method: dbPaymentMethod,
                    created_at: data.date,
                    subtotal: subtotal,
                    discount_total: discountAmount,
                    total: total,
                    status: data.paymentMethod === 'Wompi' ? 'pending' : 'paid',
                    created_by: user.userId || null
                })
                .eq('id', existingSale.id)
                .select()
                .single();
                
            if (saleError) {
                console.error('Error updating sale record:', saleError);
                return { message: 'Error al actualizar el registro de venta: ' + saleError.message };
            }
            sale = updatedSale;
        } else {
            // If no pending sale exists, but the UI sent items from the work order, it's an inconsistent state
            if ((data.items || []).some((i: any) => i.fromWorkOrder)) {
                 return { success: false, message: 'La orden de trabajo no tiene una venta pendiente válida, pero contiene productos. Intenta recargar la página o contactar soporte.' };
            }

            const { data: newSale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    organization_id: user.workshopId,
                    sale_number: saleNumber,
                    work_order_id: data.workOrderId,
                    payment_method: dbPaymentMethod,
                    created_at: data.date,
                    subtotal: subtotal,
                    discount_total: discountAmount,
                    total: total,
                    status: data.paymentMethod === 'Wompi' ? 'pending' : 'paid',
                    created_by: user.userId || null
                })
                .select()
                .single();

            if (saleError) {
                console.error('Error creating sale record:', saleError);
                return { message: 'Error al crear el registro de venta: ' + saleError.message };
            }
            sale = newSale;
        }

        // 5. Create Sale Items & Update Inventory
        const serviceItems = (data.items || []).filter(item => item.type === 'service' && item.fromWorkOrder);
        const productItems = (data.items || []).filter(item => item.type !== 'service');

        for (const item of productItems) {
            if (item.fromWorkOrder) {
                // El item ya fue insertado en sale_items y ya se le descontó el stock cuando se agregó a la orden.
                continue;
            }

            const { error: itemError } = await supabase
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    item_type: 'inventory',
                    inventory_item_id: item.inventoryItemId,
                    description: item.name || 'Producto',
                    quantity: item.quantity,
                    unit_price: item.price,
                    total: item.price * item.quantity
                });

            if (itemError) throw new Error('Error al registrar uno de los productos de la venta.');

            // Decrement stock using RPC
            const { error: updateError } = await supabase.rpc('decrement_inventory', {
                item_id: item.inventoryItemId,
                amount: item.quantity
            });
            
            if (updateError) throw new Error(`Error al descontar inventario del producto.`);
        }

        // 5.1 Registrar servicios detallados de la orden de trabajo
        let detailedServicesSum = 0;
        for (const srv of serviceItems) {
             const serviceTotal = srv.price * srv.quantity;
             detailedServicesSum += serviceTotal;
             
             await supabase
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    item_type: 'service',
                    description: srv.name || 'Servicio',
                    quantity: srv.quantity,
                    unit_price: srv.price,
                    total: serviceTotal
                });
        }

        // 5.2 Registrar diferencia de mano de obra como genérica si aplica
        const genericLaborCost = data.laborCost - detailedServicesSum;
        if (genericLaborCost > 0) {
             await supabase
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    item_type: 'service',
                    description: 'Mano de Obra adicional',
                    quantity: 1,
                    unit_price: genericLaborCost,
                    total: genericLaborCost
                });
        }

        // 6. Conditionally Update Work Order Status (Skip if Wompi pending)
        let workOrder = null;
        if (data.paymentMethod !== 'Wompi') {
            const supabaseAdmin = createAdminClient();
            
            // Separamos el update del select para evitar errores de .single() si algo falla en los joins
            const { error: workOrderError } = await supabaseAdmin
                .from('work_orders')
                .update({
                    status: 'delivered',
                    quote_status: 'approved',
                    completed_at: new Date().toISOString()
                })
                .eq('id', data.workOrderId)
                .eq('organization_id', user.workshopId);

            if (workOrderError) {
                console.error('Error updating work order status (update step):', JSON.stringify(workOrderError, null, 2));
            } else {
                // Fetch the updated data for WhatsApp alert
                const { data: updatedWorkOrder, error: fetchError } = await supabaseAdmin
                    .from('work_orders')
                    .select(`
                        motorcycle_id, 
                        order_number,
                        customer_observations,
                        motorcycles (
                            customer_id,
                            brand,
                            model,
                            license_plate,
                            model_year,
                            customers (
                                first_name,
                                last_name,
                                phone
                            )
                        ),
                        profiles!work_orders_assigned_mechanic_id_fkey (
                            first_name,
                            last_name
                        )
                    `)
                    .eq('id', data.workOrderId)
                    .eq('organization_id', user.workshopId)
                    .maybeSingle();
                
                if (fetchError) {
                    console.error('Error fetching work order after update:', JSON.stringify(fetchError, null, 2));
                }
                workOrder = updatedWorkOrder;
            }
        } else {
            // Fetch work order details without updating status for Wompi
            const { data: existingWo } = await supabase
                .from('work_orders')
                .select(`
                    motorcycle_id, 
                    order_number,
                    customer_observations,
                    motorcycles (
                        customer_id,
                        brand,
                        model,
                        license_plate,
                        model_year,
                        customers (
                            first_name,
                            last_name,
                            phone
                        )
                    ),
                    profiles!work_orders_assigned_mechanic_id_fkey (
                        first_name,
                        last_name
                    )
                `)
                .eq('id', data.workOrderId)
                .eq('organization_id', user.workshopId)
                .single();
            workOrder = existingWo;
        }

        revalidatePath('/sales');
        revalidatePath('/customers');
        revalidatePath('/motorcycles');
        revalidatePath('/work-orders');
        revalidatePath('/', 'layout');

        // Obtener los items de la venta de forma segura
        const { data: saleItems } = await supabase
            .from('sale_items')
            .select('*, inventory_items (name, code)')
            .eq('sale_id', sale.id);

        const wo = workOrder;
        const fomattedMotorcycle = wo?.motorcycles ? (Array.isArray(wo.motorcycles) ? wo.motorcycles[0] : wo.motorcycles) : undefined;
        const formattedCustomer = fomattedMotorcycle?.customers ? (Array.isArray(fomattedMotorcycle.customers) ? fomattedMotorcycle.customers[0] : fomattedMotorcycle.customers) : undefined;
        const formattedTech = wo?.profiles ? (Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles) : undefined;

        // Check for manual depositAmount first, then fallback to parse
        let parsedDeposit = data.depositAmount || 0;
        if (parsedDeposit === 0 && wo?.customer_observations) {
            const match = wo.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
            if (match) {
                parsedDeposit = parseFloat(match[1]);
            }
        }

        const formattedItems = saleItems ? saleItems.map((item: any) => ({
            name: item.item_type === 'service' 
                ? (item.description?.startsWith('Mano de Obra') ? item.description : `Mano de Obra - ${item.description || 'Servicio'}`)
                : (item.inventory_items?.name || item.description || 'Producto'),
            sku: item.inventory_items?.code || (item.item_type === 'service' ? 'SRV' : '-'),
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total || (item.quantity * item.unit_price),
            type: item.item_type
        })) : (data.items || []).map((item: any) => ({
            name: item.name || 'Producto',
            sku: item.sku || '-',
            quantity: item.quantity,
            price: item.price,
            total: item.total || (item.quantity * item.price)
        }));

        // 7. Send Notification (Skip receipt if Wompi, webhook handles it)
        console.log(`[Sales Action] Checking notification conditions. Customer Phone: ${formattedCustomer?.phone || 'NOT FOUND'}, Payment Method: ${data.paymentMethod}`);
        if (formattedCustomer?.phone && data.paymentMethod !== 'Wompi') {
            try {
                const canSend = await checkAndUpdateWhatsAppLimit(user.workshopId);
                if (canSend) {
                    const firstName = formattedCustomer.first_name || '';
                    const lastName = formattedCustomer.last_name || '';
                    const customerFullName = formattedCustomer ? `${firstName} ${lastName}`.trim() || 'Cliente' : 'Cliente';
                    
                    console.log(`[Sales Action] Sending service sale notification to ${customerFullName} (${formattedCustomer.phone})...`);
                    const notifyResult = await sendServiceSaleNotification(
                        formattedCustomer.phone,
                        customerFullName,
                        wo?.order_number || saleNumber,
                        total,
                        {
                            make: fomattedMotorcycle?.brand || 'Moto',
                            model: fomattedMotorcycle?.model || '',
                            plate: fomattedMotorcycle?.license_plate || 'Sin Placa'
                        },
                        formattedTech ? `${formattedTech.first_name} ${formattedTech.last_name}`.trim() : 'Técnico',
                        data.laborCost > 0 ? data.laborCost : undefined,
                        formattedItems,
                        subtotal,
                        data.discountPercentage,
                        discountAmount,
                        workshopName
                    );
                    
                    console.log('[Sales Action] Notification result:', JSON.stringify(notifyResult, null, 2));
                    
                } else {
                    console.warn(`WhatsApp limit reached for org ${user.workshopId}. Skipping sale notification.`);
                }
            } catch (notifyError: any) {
                console.error('[Sales Action] Service sale notification error:', notifyError);
            }
        } else {
            console.log('[Sales Action] Notification skipped because customer has no phone or payment method is Wompi.');
        }

        const formattedSale = {
            id: sale.id,
            saleNumber: saleNumber,
            date: new Date().toISOString(),
            subtotal: subtotal,
            discountPercentage: data.discountPercentage,
            discountAmount: discountAmount,
            depositAmount: parsedDeposit,
            remainingBalance: parsedDeposit > 0 ? Math.max(0, total - parsedDeposit) : undefined,
            total: total,
            paymentMethod: data.paymentMethod === 'Wompi' ? 'Wompi' : mapPaymentMethodToUi(dbPaymentMethod),
            workOrderId: wo?.order_number,
            customerName: formattedCustomer ? `${formattedCustomer.first_name} ${formattedCustomer.last_name}`.trim() : undefined,
            workshopName: workshopName,
            motorcycleInfo: fomattedMotorcycle ? {
                make: fomattedMotorcycle.brand,
                model: fomattedMotorcycle.model,
                year: fomattedMotorcycle.model_year,
                plate: fomattedMotorcycle.license_plate,
            } : undefined,
            technicianName: formattedTech ? `${formattedTech.first_name} ${formattedTech.last_name}` : undefined,
            laborCost: data.laborCost > 0 ? data.laborCost : undefined,
            items: formattedItems
        };

        return { success: true, sale: formattedSale };
    } catch (error: any) {
        console.error('Error creating service sale:', error);
        return { message: 'Error al crear la venta de servicio: ' + (error.message || error) };
    }
}

export async function createDirectSale(prevState: any, formData: FormData) {
    console.log('createDirectSale started');
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Fetch workshop name for receipt
    const { data: orgData } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();
    const workshopName = orgData?.name || 'MotoManager';

    try {
        const itemsRaw = formData.get('items') as string;
        const items = JSON.parse(itemsRaw || '[]');
        const customerId = formData.get('customerId')?.toString() || undefined;
        const cedula = formData.get('cedula')?.toString() || undefined;
        const customerName = formData.get('customerName')?.toString() || undefined;
        const phone = formData.get('phone')?.toString() || undefined;
        const paymentMethod = formData.get('paymentMethod') as string;
        const date = formData.get('date') as string;
        const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0;

        const validatedFields = directSaleSchema.safeParse({
            customerId, cedula, customerName, phone, paymentMethod, date, items, discountPercentage,
        });

        if (!validatedFields.success) {
            console.error('Direct Sale Validation Failed:', validatedFields.error.flatten());
            return { errors: validatedFields.error.flatten().fieldErrors };
        }

        const data = validatedFields.data;
        const dbPaymentMethod = mapPaymentMethodToDb(data.paymentMethod);

        // 1. Handle Customer
        let finalCustomerId = data.customerId;
        let finalCustomerPhone = data.phone;
        let finalCustomerName = data.customerName;

        if (!finalCustomerId && data.cedula && data.customerName) {
            // Customer with cedula: look up or create
            const { data: existing } = await supabase
                .from('customers')
                .select('id, phone, first_name, last_name')
                .eq('organization_id', user.workshopId)
                .eq('document_number', data.cedula)
                .maybeSingle();

            if (existing) {
                finalCustomerId = existing.id;
                if(!finalCustomerPhone) finalCustomerPhone = existing.phone;
                if(!finalCustomerName) finalCustomerName = `${existing.first_name} ${existing.last_name}`;
            } else {
                const { firstName, lastName } = splitName(data.customerName);
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                        organization_id: user.workshopId,
                        first_name: firstName,
                        last_name: lastName,
                        document_number: data.cedula,
                        phone: data.phone,
                        created_by: user.userId || null
                    })
                    .select('id')
                    .single();

                if (createError) return { message: 'Error al crear el cliente: ' + createError.message };
                finalCustomerId = newCustomer.id;
            }
        } else if (!finalCustomerId && !data.cedula && data.customerName) {
            // Customer with name only (no cedula): create minimal record to preserve the name
            const { firstName, lastName } = splitName(data.customerName);
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    organization_id: user.workshopId,
                    first_name: firstName,
                    last_name: lastName,
                    phone: data.phone || null,
                    created_by: user.userId || null
                })
                .select('id')
                .single();

            if (!createError && newCustomer) {
                finalCustomerId = newCustomer.id;
            }
        }

        // 2. Generate Number with 'V' prefix
        const saleNumber = await generateSaleNumber(supabase, user.workshopId, 'V');
        
        // 3. Check Inventory
        for (const item of data.items || []) {
            if (item.type === 'service') continue;
            
            const { data: invItem } = await supabase
                .from('inventory_items')
                .select('quantity, name')
                .eq('id', item.inventoryItemId)
                .single();

            if (!invItem || invItem.quantity < item.quantity) {
                return { message: `Stock insuficiente para ${invItem?.name || 'producto'}.` };
            }
        }

        // 4. Calculate Totals
        const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = subtotal * ((data.discountPercentage || 0) / 100);
        const total = subtotal - discountAmount;

        // 5. Create Sale
        const initialStatus = data.paymentMethod === 'Wompi' ? 'pending' : 'paid';
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                organization_id: user.workshopId,
                sale_number: saleNumber,
                customer_id: finalCustomerId || null,
                payment_method: dbPaymentMethod,
                created_at: data.date,
                subtotal: subtotal,
                discount_total: discountAmount,
                total: total,
                status: initialStatus,
                created_by: user.userId || null
            })
            .select()
            .single();

        if (saleError) return { message: 'Error al crear la venta directa: ' + saleError.message };

        // 6. Items & Inventory
        for (const item of data.items) {
            if (item.type === 'service') {
                await supabase
                    .from('sale_items')
                    .insert({
                        sale_id: sale.id,
                        item_type: 'service',
                        description: item.name || 'Servicio',
                        quantity: item.quantity,
                        unit_price: item.price,
                        total: item.price * item.quantity
                    });
            } else {
                await supabase
                    .from('sale_items')
                    .insert({
                        sale_id: sale.id,
                        item_type: 'inventory',
                        inventory_item_id: item.inventoryItemId,
                        description: 'Producto directo',
                        quantity: item.quantity,
                        unit_price: item.price,
                        total: item.price * item.quantity
                    });

                const { error: updateError } = await supabase.rpc('decrement_inventory', {
                    item_id: item.inventoryItemId,
                    amount: item.quantity
                });
                if (updateError) throw new Error(`Error al descontar inventario.`);
            }
        }

        // 7. Return formatted sale
        const { data: fullSale, error: fullSaleError } = await supabase
            .from('sales')
            .select(`
                *,
                sale_items (
                    *,
                    inventory_items (name, code)
                ),
                customers (first_name, last_name)
            `)
            .eq('id', sale.id)
            .single();

        // 8. Send Notification
        try {
            if (initialStatus === 'paid' && finalCustomerPhone) {
                const { data: org } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();
                
                // Map items from fullSale or fallback to data.items
                const notificationItems = fullSale?.sale_items
                    ? fullSale.sale_items.map((si: any) => ({
                        name: si.inventory_items?.name || si.description || 'Producto',
                        quantity: si.quantity,
                        price: si.unit_price
                    }))
                    : data.items.map((item: any) => ({
                        name: item.name || 'Producto',
                        quantity: item.quantity,
                        price: item.price
                    }));

                const canSend = await checkAndUpdateWhatsAppLimit(user.workshopId);
                if (canSend) {
                    await sendDirectSalePaidNotification(
                        finalCustomerPhone,
                        finalCustomerName || 'Cliente',
                        org?.name || 'MotoManager',
                        saleNumber,
                        total,
                        data.paymentMethod,
                        notificationItems
                    );
                } else {
                    console.warn(`WhatsApp limit reached for org ${user.workshopId}. Skipping direct sale notification.`);
                }
            }
        } catch (notifyError) {
            console.error('Direct sale notification error:', notifyError);
        }

        revalidatePath('/sales');
        revalidatePath('/inventory');
        revalidatePath('/', 'layout');

        if (fullSaleError || !fullSale) {
            console.error('Error fetching full direct sale for receipt:', fullSaleError);
            return { success: true, sale: {
                id: sale.id,
                saleNumber: sale.sale_number,
                date: sale.created_at,
                subtotal: subtotal,
                discountPercentage: data.discountPercentage,
                discountAmount: discountAmount,
                total: sale.total,
                paymentMethod: data.paymentMethod === 'Wompi' ? 'Wompi' : mapPaymentMethodToUi(sale.payment_method),
                customerName: finalCustomerName || 'Cliente de Mostrador',
                workshopName: workshopName,
                items: data.items || []
            }};
        }

        const customer = Array.isArray(fullSale.customers) ? fullSale.customers[0] : fullSale.customers;

        const formattedSale = {
            id: fullSale.id,
            saleNumber: fullSale.sale_number,
            date: fullSale.created_at,
            subtotal: subtotal,
            discountPercentage: data.discountPercentage,
            discountAmount: discountAmount,
            total: fullSale.total,
            paymentMethod: data.paymentMethod === 'Wompi' ? 'Wompi' : mapPaymentMethodToUi(fullSale.payment_method),
            customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Cliente de Mostrador',
            workshopName: workshopName,
            items: fullSale.sale_items?.map((item: any) => ({
                name: item.inventory_items?.name || item.description || 'Producto',
                sku: item.inventory_items?.code,
                quantity: item.quantity,
                price: item.unit_price,
                total: item.total,
            })) || []
        };

        return { success: true, sale: formattedSale };

    } catch (error: any) {
        console.error('Error creating direct sale:', error);
        return { message: 'Error al crear la venta directa: ' + (error.message || error) };
    }
}

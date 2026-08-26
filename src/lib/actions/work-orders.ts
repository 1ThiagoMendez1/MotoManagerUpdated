'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendOrderStatusUpdate, sendQuoteNotification, sendMotoIngresoNotification, sendDiagnosticadoReparadoNotification } from '@/lib/whatsapp';

const workOrderSchema = z.object({
    motorcycleId: z.string().min(1, 'Se requiere la motocicleta.'),
    technicianId: z.string().min(1, 'Se requiere el técnico.'),
});

// UI uses Spanish statuses. DB uses English ENUMs.
function mapStatusToDb(uiStatus: string) {
    if (uiStatus === 'Diagnosticando') return 'diagnosis';
    if (uiStatus === 'En proceso') return 'in_progress';
    if (uiStatus === 'Reparado') return 'completed';
    if (uiStatus === 'Entregado') return 'delivered';
    if (uiStatus === 'Moto entregada por cotización rechazada') return 'delivered_quote_rejected';
    if (uiStatus === 'Ingreso a revisión') return 'received';
    return 'draft';
}

function mapStatusToUi(dbStatus: string) {
    if (dbStatus === 'diagnosis') return 'Diagnosticando';
    if (dbStatus === 'in_progress') return 'En proceso';
    if (dbStatus === 'completed') return 'Reparado';
    if (dbStatus === 'delivered') return 'Entregado';
    if (dbStatus === 'delivered_quote_rejected') return 'Moto entregada por cotización rechazada';
    if (dbStatus === 'received') return 'Ingreso a revisión';
    return dbStatus;
}

export async function createWorkOrder(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const validatedFields = workOrderSchema.safeParse({
        motorcycleId: formData.get('motorcycleId'),
        technicianId: formData.get('technicianId'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { motorcycleId, technicianId } = validatedFields.data;

    const { data: mc, error: mcError } = await supabase
        .from('motorcycles')
        .select('license_plate, notes, customer_id')
        .eq('id', motorcycleId)
        .eq('organization_id', user.workshopId)
        .single();

    if (mcError || !mc) {
        return { message: 'Error: La motocicleta no existe o no pertenece a este taller.' };
    }

    // Check for duplicate active work order across all workshops
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const { data: activeOrders } = await supabaseAdmin
        .from('work_orders')
        .select(`
            id,
            status,
            organization_id,
            motorcycles!inner(license_plate)
        `)
        .ilike('motorcycles.license_plate', mc.license_plate.trim())
        .neq('status', 'delivered')
        .neq('status', 'delivered_quote_rejected')
        .neq('status', 'cancelled');

    const activeOrder = activeOrders?.find(wo => wo.status !== 'delivered' && wo.status !== 'delivered_quote_rejected' && wo.status !== 'cancelled');
        
    if (activeOrder) {
        if (activeOrder.organization_id === user.workshopId) {
            return { message: 'Esta motocicleta ya tiene una orden de trabajo activa en el taller.' };
        } else {
            return { message: 'Esta motocicleta ya tiene una orden de trabajo activa en otro taller y no puede ser registrada hasta que finalice.' };
        }
    }

    const issueDescription = mc.notes || '';

    // Utilizando la función RPC transaccional que definimos
    const { data: newOrderId, error } = await supabase
        .rpc('create_work_order', {
            p_organization_id: user.workshopId,
            p_customer_id: mc.customer_id,
            p_motorcycle_id: motorcycleId,
            p_reported_symptoms: issueDescription
        });
        
    let createdOrderId: string | null = null;

    if (error) {
        // Fallback si el RPC falla por algún motivo
        const { data: insertData, error: insertError } = await supabase
            .from('work_orders')
            .insert({
                organization_id: user.workshopId,
                motorcycle_id: motorcycleId,
                assigned_mechanic_id: technicianId,
                status: 'received',
                reported_symptoms: issueDescription,
                created_by: user.userId || null
            })
            .select('id')
            .single();
            
        if (insertError) {
            console.error('Error creating work order:', insertError);
            return { message: 'Error al crear orden.' };
        }
        createdOrderId = insertData?.id || null;
    } else {
        // Asignar mecánico a la orden creada por RPC
        const { error: updateError } = await supabase
            .from('work_orders')
            .update({ assigned_mechanic_id: technicianId, status: 'received' })
            .eq('id', newOrderId)
            .eq('organization_id', user.workshopId);
            
        if (updateError) {
            console.error('Error assigning technician:', updateError);
            return { message: 'Error al asignar el técnico a la orden de trabajo.' };
        }
        createdOrderId = newOrderId;
    }

    // Enviar notificación por WhatsApp de ingreso de moto si hay ID de orden creado
    if (createdOrderId) {
        try {
            const { data: woData, error: fetchError } = await supabase
                .from('work_orders')
                .select(`
                    order_number,
                    created_at,
                    organizations (
                        name
                    ),
                    motorcycles (
                        brand,
                        model,
                        license_plate,
                        customers (
                            first_name,
                            last_name,
                            phone
                        )
                    )
                `)
                .eq('id', createdOrderId)
                .single();

            if (woData && !fetchError) {
                const mcRaw = woData.motorcycles;
                const mcObj = Array.isArray(mcRaw) ? mcRaw[0] : mcRaw;
                const customerRaw = mcObj?.customers;
                const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
                const orgRaw = woData.organizations;
                const orgObj = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
                const workshopName = orgObj?.name || 'Águilas Doradas';

                if (customer?.phone) {
                    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                    const brand = mcObj?.brand || 'Motocicleta';
                    const model = mcObj?.model || 'Modelo';
                    const plate = mcObj?.license_plate || '';
                    const orderNumber = woData.order_number?.toString() || createdOrderId.substring(0, 8);
                    const intakeDate = woData.created_at || new Date();

                    sendMotoIngresoNotification(
                        customer.phone,
                        customerName || 'Cliente',
                        workshopName,
                        brand,
                        model,
                        plate,
                        intakeDate,
                        orderNumber
                    ).catch(err => console.error('Error sending WhatsApp moto ingreso update:', err));
                }
            }
        } catch (fetchErr) {
            console.error('Error fetching details for WhatsApp moto ingreso notification:', fetchErr);
        }
    }

    revalidatePath('/work-orders');
    return { success: true };
}

export async function updateWorkOrderStatus(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const id = formData.get('id') as string;
    const uiStatus = formData.get('status') as string;
    const status = mapStatusToDb(uiStatus);

    const updateData: any = { status };
    const now = new Date().toISOString();

    if (status === 'delivered' || status === 'delivered_quote_rejected') {
        updateData.completed_at = now;
    } else if (status === 'in_progress') {
        updateData.started_at = now;
    }

    // Obtener estado anterior antes de actualizar
    const { data: oldWo } = await supabase
        .from('work_orders')
        .select('status')
        .eq('id', id)
        .eq('organization_id', user.workshopId)
        .single();
    const oldStatus = oldWo?.status;

    const { error, data: _updatedWo } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', user.workshopId)
        .select(`
            motorcycle_id, 
            order_number,
            motorcycles (
                customer_id,
                brand,
                model,
                license_plate,
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
        .single();

    const updatedWo = _updatedWo as any;


    if (error) {
        console.error('Error updating work order status:', error.message, error.code, error.details);
        return { message: `Error al actualizar el estado: ${error.message}` };
    }

    if (updatedWo) {
        const mc = Array.isArray(updatedWo.motorcycles) ? updatedWo.motorcycles[0] : updatedWo.motorcycles;
        const customer = mc?.customers;
        const tech = Array.isArray(updatedWo.profiles) ? updatedWo.profiles[0] : updatedWo.profiles;

        // Recuperar ítems de la orden (work_order_services) en el nuevo esquema en lugar de sales
        let usedPartsItems: Array<{ name: string; quantity: number; price: number }> | undefined = undefined;

        if (status === 'completed') {
            const { data: woServices } = await supabase
                .from('work_order_services')
                .select('description, quantity, unit_price')
                .eq('work_order_id', id);

            if (woServices) {
                usedPartsItems = woServices.map((si: any) => ({
                    name: si.description || 'Servicio/Repuesto',
                    quantity: Number(si.quantity),
                    price: Number(si.unit_price)
                }));
            }
        }

        // Recuperar nombre y dirección del taller de workshops
        let { data: workshop } = await supabase
            .from('workshops')
            .select('name, address')
            .eq('id', user.workshopId)
            .single();

        // Fallback a organizations si falla o no tiene nombre
        if (!workshop || !workshop.name) {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('name, settings')
                .eq('id', user.workshopId)
                .single();
            if (orgData) {
                workshop = {
                    name: orgData.name,
                    address: workshop?.address || (orgData.settings as any)?.address || ''
                };
            }
        }

        if (customer?.phone) {
            const isDiagnosticadoToReparado = oldStatus === 'diagnosis' && status === 'completed';

            if (isDiagnosticadoToReparado) {
                const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente';
                const motorcycleInfo = `${mc?.brand || ''} ${mc?.model || ''}`.trim() || 'Motocicleta';
                const plate = mc?.license_plate || '';
                const orderNum = updatedWo.order_number?.toString() || id.substring(0, 8);
                const address = workshop?.address || '';

                sendDiagnosticadoReparadoNotification(
                    customer.phone,
                    customerName,
                    workshop?.name || 'Taller',
                    motorcycleInfo,
                    plate,
                    orderNum,
                    address
                ).catch(err => console.error('Error sending WhatsApp diagnosticado_reparado template:', err));
            } else {
                sendOrderStatusUpdate(
                    customer.phone,
                    {
                        orderNumber: updatedWo.order_number?.toString() || id.substring(0, 8),
                        status: uiStatus as any,
                        customerName: `${customer.first_name} ${customer.last_name}`.trim() || 'Cliente',
                        motorcycleInfo: `${mc?.brand} ${mc?.model} (${mc?.license_plate})`,
                        technicianName: tech ? `${tech.first_name} ${tech.last_name}` : 'Técnico asignado',
                        items: usedPartsItems,
                        workshopName: workshop?.name
                    }
                ).catch(err => console.error('Error sending WhatsApp order status update:', err));
            }
        }
    }

    revalidatePath('/work-orders');
    return { success: true };
}

export async function reassignWorkOrderTechnician(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const id = formData.get('id') as string;
    const technicianId = formData.get('technicianId') as string;

    if (!id || !technicianId) {
        return { message: 'Datos incompletos.' };
    }

    const { error } = await supabase
        .from('work_orders')
        .update({ assigned_mechanic_id: technicianId })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) return { message: 'Error al reasignar técnico' };

    revalidatePath('/work-orders');
    revalidatePath(`/work-orders/${id}`);
    return { success: true };
}

export async function addDepositToWorkOrder(formData: FormData) {
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

        // Query current abonos directly from sales
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
    
    // RESTORE THE CUSTOMER OBSERVATIONS UPDATE FOR COMPATIBILITY
    const totalAbono = currentAbono + amountToAdd;
    let currentObs = woData?.customer_observations || '';
    currentObs = currentObs.replace(/Abono registrado:\s*(\d+(\.\d+)?)\s*/, '').trim();
    
    const newObs = totalAbono > 0 
        ? `Abono registrado: ${totalAbono}${currentObs ? '\n' + currentObs : ''}` 
        : currentObs;

    await supabase
        .from('work_orders')
        .update({ customer_observations: newObs })
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId);

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
                sale_number: `AB-${woData?.order_number}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`,
                subtotal: amountToAdd,
                total: amountToAdd,
                payment_method: dbPaymentMethod,
                status: 'paid',
                notes: `Abono de orden #${woData?.order_number} - ${plate}`
            }).select().single();
            
            
        }
    }

    revalidatePath('/work-orders/' + workOrderId);
}

export async function updateWorkOrderSolution(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const solutionDescription = formData.get('solutionDescription') as string;

    const { error } = await supabase
        .from('work_orders')
        .update({ technical_diagnosis: solutionDescription }) // Mapeado a technical_diagnosis
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId);

    if (error) throw new Error('Error al actualizar solución');

    revalidatePath('/work-orders/' + workOrderId);
}

export async function addItemToWorkOrder(formData: FormData) {
    try {
        const user = await requireWorkshop();
        const supabase = await createClient();

        const workOrderId = formData.get('workOrderId') as string;
        const itemId = formData.get('inventoryItemId') as string;
        const quantity = parseInt(formData.get('quantity') as string, 10) || 1;

        if (!workOrderId) {
            return { success: false, error: 'ID de la orden de trabajo no proporcionado.' };
        }

        if (!itemId) {
            return { success: false, error: 'Por favor, selecciona un artículo del inventario.' };
        }

        // Obtener estado de la orden para saber si descontamos de una vez
        const { data: orderData } = await supabase
            .from('work_orders')
            .select('status')
            .eq('id', workOrderId)
            .single();
        
        const isApproved = ['approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'delivered', 'delivered_quote_rejected'].includes(orderData?.status);

        // Obtener detalles del item
        const { data: inventoryItem } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', itemId)
            .single();
            
        if (!inventoryItem) {
            return { success: false, error: 'El repuesto seleccionado no existe o no fue encontrado.' };
        }

        // Buscar si ya existe una venta para esta orden
        let { data: sale } = await supabase
            .from('sales')
            .select('id')
            .eq('work_order_id', workOrderId)
            .maybeSingle();

        if (!sale) {
            const { data: newSale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    organization_id: user.workshopId,
                    work_order_id: workOrderId,
                    status: 'pending',
                    total: 0
                })
                .select()
                .single();
                
            if (saleError || !newSale) {
                return { success: false, error: 'Error al crear la venta asociada a la orden.' };
            }
            sale = newSale;
        }

        if (!sale) {
            return { success: false, error: 'No se pudo obtener la venta asociada.' };
        }

        const { error: itemError } = await supabase
            .from('sale_items')
            .insert({
                sale_id: sale.id,
                item_type: 'inventory',
                inventory_item_id: itemId,
                description: inventoryItem.name,
                quantity: quantity,
                unit_price: inventoryItem.unit_price,
                total: quantity * inventoryItem.unit_price
            });

        if (itemError) {
            return { success: false, error: 'Error al agregar el repuesto a la orden.' };
        }

        // Descontar inventario inmediatamente si la cotización ya fue aprobada y tiene control de inventario
        if (isApproved && inventoryItem.track_inventory !== false) {
            const { error: decrementError } = await supabase.rpc('decrement_inventory', {
                p_item_id: itemId,
                p_amount: quantity
            });
            if (decrementError) {
                console.error('Error al descontar inventario en orden aprobada:', decrementError);
                return { success: false, error: 'Stock insuficiente o error al descontar del inventario.' };
            }
        }

        revalidatePath('/work-orders/' + workOrderId);
        return { success: true };
    } catch (e: any) {
        console.error('Error in addItemToWorkOrder server action:', e);
        return { success: false, error: e.message || 'Ocurrió un error inesperado al agregar el artículo.' };
    }
}

export async function removeItemFromWorkOrder(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const saleItemId = formData.get('saleItemId') as string;

    if (!workOrderId || !saleItemId) return;

    // Verificar si la orden estaba aprobada y necesitamos devolver stock
    const { data: orderData } = await supabase
        .from('work_orders')
        .select('status')
        .eq('id', workOrderId)
        .single();
        
    const isApproved = ['approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'delivered', 'delivered_quote_rejected'].includes(orderData?.status);

    const { data: saleItem } = await supabase
        .from('sale_items')
        .select('*')
        .eq('id', saleItemId)
        .single();

    if (isApproved && saleItem && saleItem.item_type === 'inventory' && saleItem.inventory_item_id) {
        // Devolver el stock a vitrina (storefront)
        const { data: vitrinaLoc } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('type', 'storefront')
            .limit(1)
            .maybeSingle();

        if (vitrinaLoc) {
            const { data: currentStock } = await supabase
                .from('inventory_item_stock')
                .select('quantity')
                .eq('item_id', saleItem.inventory_item_id)
                .eq('location_id', vitrinaLoc.id)
                .maybeSingle();

            if (currentStock) {
                await supabase
                    .from('inventory_item_stock')
                    .update({ quantity: Number(currentStock.quantity) + Number(saleItem.quantity) })
                    .eq('item_id', saleItem.inventory_item_id)
                    .eq('location_id', vitrinaLoc.id);
            }
        }
    }

    const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('id', saleItemId);
        
    if (deleteError) {
        console.error("Error deleting sale item:", deleteError);
    }

    revalidatePath('/work-orders/' + workOrderId);
}

export async function sendQuoteWhatsApp(
    workOrderId: string,
    customerPhone: string,
    customerName: string,
    workshopName: string,
    portalUrl: string,
    orderNumber?: string,
    technicianName?: string
) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Actualizar estado de la orden a 'esperando aprobación'
    const { error: updateError } = await supabase.from('work_orders').update({
        status: 'waiting_approval',
        quote_status: 'pending'
    }).eq('id', workOrderId).eq('organization_id', user.workshopId);

    if (updateError) {
        console.error('Error al actualizar work_orders en sendQuoteWhatsApp:', updateError);
        return { success: false, error: 'DB Error: ' + updateError.message + ' / ' + updateError.details + ' / ' + updateError.hint };
    }

    let result = null;
    
    // Si no hay teléfono, usamos uno de prueba para poder ver la cotización simulada en consola
    const phoneToUse = (customerPhone && customerPhone.trim() !== '') ? customerPhone : '3000000000';
    
    result = await sendQuoteNotification(
        phoneToUse,
        customerName || 'Cliente',
        workshopName,
        workOrderId,
        portalUrl,
        orderNumber,
        technicianName
    );

    revalidatePath('/work-orders/' + workOrderId);
    revalidatePath('/work-orders');

    return result;
}

export async function updateQuoteStatus(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const id = formData.get('id') as string;
    const quoteStatus = formData.get('quoteStatus') as string;

    if (!id || !quoteStatus) {
        return { message: 'Datos incompletos.' };
    }

    const dbQuoteStatus = quoteStatus === 'Aprobada' ? 'approved' : 
                          quoteStatus === 'Rechazada' ? 'rejected' : 
                          'pending';

    // Manejo inteligente e innovador del inventario según aprobación/rechazo
    const { data: woData } = await supabase.from('work_orders').select('status, customer_observations').eq('id', id).single();
    if (!woData) {
        return { message: 'Orden de trabajo no encontrada.' };
    }

    const wasApproved = ['approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'delivered', 'delivered_quote_rejected'].includes(woData.status);

    const { data: sale } = await supabase.from('sales').select('id').eq('work_order_id', id).maybeSingle();
    let quoteItems: any[] = [];
    if (sale) {
        const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
        quoteItems = items || [];
    }

    let newStatus = woData.status;

    if (dbQuoteStatus === 'approved') {
        if (!wasApproved) {
            // Si recién se aprueba, descontamos el stock reservado
            for (const item of quoteItems) {
                if (item.item_type === 'inventory' && item.inventory_item_id) {
                    const { data: invItem } = await supabase.from('inventory_items').select('track_inventory').eq('id', item.inventory_item_id).single();
                    if (invItem && invItem.track_inventory !== false) {
                        await supabase.rpc('decrement_inventory', { p_item_id: item.inventory_item_id, p_amount: item.quantity });
                    }
                }
            }
        }
        if (!['completed', 'delivered', 'delivered_quote_rejected'].includes(woData.status)) {
            newStatus = 'diagnosis';
        }
    } else if (dbQuoteStatus === 'rejected') {
        if (wasApproved) {
            // Devolver el inventario si la orden estaba aprobada (por error y la rechazan después)
            const { data: vitrinaLoc } = await supabase
                .from('inventory_locations')
                .select('id')
                .eq('organization_id', user.workshopId)
                .eq('type', 'storefront')
                .limit(1)
                .maybeSingle();

            for (const item of quoteItems) {
                if (item.item_type === 'inventory' && item.inventory_item_id && vitrinaLoc) {
                    const { data: currentStock } = await supabase
                        .from('inventory_item_stock')
                        .select('quantity')
                        .eq('item_id', item.inventory_item_id)
                        .eq('location_id', vitrinaLoc.id)
                        .maybeSingle();
                        
                    if (currentStock) {
                        await supabase
                            .from('inventory_item_stock')
                            .update({ quantity: Number(currentStock.quantity) + Number(item.quantity) })
                            .eq('item_id', item.inventory_item_id)
                            .eq('location_id', vitrinaLoc.id);
                    }
                }
            }
        }
        if (!['completed', 'delivered', 'delivered_quote_rejected'].includes(woData.status)) {
            newStatus = 'diagnosis';
        }

        if (sale && quoteItems.length > 0) {
            // Dejar historial
            const rejectMsg = `\n[Cotización Rechazada]`;
            const newObs = (woData.customer_observations || '') + rejectMsg;
            await supabase.from('work_orders').update({ customer_observations: newObs }).eq('id', id);
        }
    } else {
        if (!['completed', 'delivered', 'delivered_quote_rejected'].includes(woData.status)) {
            newStatus = 'waiting_approval';
        }
    }

    const { error } = await supabase
        .from('work_orders')
        .update({ 
            status: newStatus,
            quote_status: dbQuoteStatus,
            quote_responded_at: dbQuoteStatus !== 'pending' ? new Date().toISOString() : null
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) return { message: 'Error al actualizar cotización: ' + error.message };

    revalidatePath('/work-orders');
    revalidatePath(`/work-orders/${id}`);
    return { success: true };
}

export async function addWorkOrderEvidence(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const description = formData.get('description') as string;

    if (!workOrderId || !imageUrl) {
        throw new Error('Datos incompletos.');
    }
    
    // Guardar referencia en la base de datos
    const { error } = await supabase
        .from('work_order_evidences')
        .insert({
            organization_id: user.workshopId,
            work_order_id: workOrderId,
            image_url: imageUrl,
            description: description || null,
            created_by: user.userId || null
        });

    if (error) {
        console.error('Error saving evidence to DB:', error);
        throw new Error('Error al guardar la evidencia en base de datos.');
    }

    revalidatePath('/work-orders/' + workOrderId);
    return { success: true };
}

export async function deleteWorkOrderEvidence(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const id = formData.get('id') as string;
    const imageUrl = formData.get('imageUrl') as string;

    if (!id || !imageUrl) return { message: 'ID o URL faltante' };

    // 1. Eliminar archivo de Supabase Storage
    try {
        // Extraer el nombre del archivo de la URL pública.
        // Asume formato: .../storage/v1/object/public/evidences/<organization_id>/<filename>
        const urlParts = imageUrl.split('/evidences/');
        if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('evidences').remove([filePath]);
        }
    } catch (e) {
        console.error('Error deleting file from storage:', e);
        // Continuamos para borrar el registro de la BD de todos modos
    }

    // 2. Eliminar registro de la base de datos
    const { error } = await supabase
        .from('work_order_evidences')
        .delete()
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        return { message: 'Error al eliminar evidencia' };
    }

    revalidatePath('/work-orders');
    return { success: true };
}

export async function requestPartForWorkOrder(formData: FormData) {
    try {
        const user = await requireWorkshop();
        const supabase = await createClient();

        const workOrderId = formData.get('workOrderId') as string;
        const itemId = formData.get('inventoryItemId') as string;
        const quantity = parseInt(formData.get('quantity') as string, 10) || 1;

        if (!workOrderId || !itemId) {
            return { success: false, error: 'Datos incompletos.' };
        }

        const { error } = await supabase
            .from('part_requests')
            .insert({
                organization_id: user.workshopId,
                work_order_id: workOrderId,
                inventory_item_id: itemId,
                requested_by: user.userId,
                quantity: quantity,
                status: 'pending'
            });

        if (error) {
            console.error('Error creating part request:', error);
            return { success: false, error: 'Error al solicitar el repuesto.' };
        }

        revalidatePath('/work-orders/' + workOrderId);
        return { success: true };
    } catch (e: any) {
        console.error('Error in requestPartForWorkOrder:', e);
        return { success: false, error: e.message || 'Error inesperado.' };
    }
}

export async function fulfillPartRequest(requestId: string, workOrderId: string) {
    try {
        const user = await requireWorkshop();
        const supabase = await createClient();

        // 1. Get request details
        const { data: request, error: reqError } = await supabase
            .from('part_requests')
            .select('*, inventory_items(*)')
            .eq('id', requestId)
            .eq('organization_id', user.workshopId)
            .single();

        if (reqError || !request) return { success: false, error: 'Solicitud no encontrada.' };
        if (request.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

        // 2. Add to sale_items
        let { data: sale } = await supabase
            .from('sales')
            .select('id')
            .eq('work_order_id', workOrderId)
            .maybeSingle();

        if (!sale) {
            const { data: newSale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    organization_id: user.workshopId,
                    work_order_id: workOrderId,
                    status: 'pending',
                    total: 0
                })
                .select()
                .single();
            if (saleError || !newSale) return { success: false, error: 'Error al crear venta.' };
            sale = newSale;
        }

        const invItem = request.inventory_items;

        const { error: itemError } = await supabase
            .from('sale_items')
            .insert({
                sale_id: sale!.id,
                item_type: 'inventory',
                inventory_item_id: request.inventory_item_id,
                description: invItem.name,
                quantity: request.quantity,
                unit_price: invItem.unit_price,
                total: request.quantity * invItem.unit_price
            });

        if (itemError) return { success: false, error: 'Error al agregar a la factura.' };

        // 3. Deduct inventory if order is approved or beyond
        const { data: orderData } = await supabase
            .from('work_orders')
            .select('status')
            .eq('id', workOrderId)
            .single();
            
        const isApproved = ['approved', 'in_progress', 'waiting_parts', 'quality_check', 'completed', 'delivered', 'delivered_quote_rejected'].includes(orderData?.status);

        if (isApproved && invItem && invItem.track_inventory !== false) {
            const { error: decrementError } = await supabase.rpc('decrement_inventory', {
                p_item_id: request.inventory_item_id,
                p_amount: request.quantity
            });
            if (decrementError) {
                console.error('Error al descontar inventario en orden aprobada:', decrementError);
                return { success: false, error: 'Stock insuficiente o error al descontar del inventario.' };
            }
        }

        // 4. Mark request as fulfilled
        await supabase
            .from('part_requests')
            .update({
                status: 'fulfilled',
                fulfilled_by: user.userId,
                fulfilled_at: new Date().toISOString()
            })
            .eq('id', requestId);

        revalidatePath('/work-orders/' + workOrderId);
        return { success: true };
    } catch (e: any) {
        console.error('Error in fulfillPartRequest:', e);
        return { success: false, error: e.message };
    }
}

export async function rejectPartRequest(requestId: string, workOrderId: string) {
    try {
        const user = await requireWorkshop();
        const supabase = await createClient();

        const { error } = await supabase
            .from('part_requests')
            .update({
                status: 'rejected',
                fulfilled_by: user.userId,
                fulfilled_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('organization_id', user.workshopId);

        if (error) return { success: false, error: 'Error al rechazar.' };

        revalidatePath('/work-orders/' + workOrderId);
        return { success: true };
    } catch (e: any) {
        console.error('Error in rejectPartRequest:', e);
        return { success: false, error: e.message };
    }
}

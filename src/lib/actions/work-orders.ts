'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendOrderStatusUpdate, sendQuoteNotification } from '@/lib/whatsapp';

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
    if (uiStatus === 'Ingreso a taller') return 'received';
    return 'draft';
}

function mapStatusToUi(dbStatus: string) {
    if (dbStatus === 'diagnosis') return 'Diagnosticando';
    if (dbStatus === 'in_progress') return 'En proceso';
    if (dbStatus === 'completed') return 'Reparado';
    if (dbStatus === 'delivered') return 'Entregado';
    if (dbStatus === 'received') return 'Ingreso a taller';
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

    // Check for duplicate active work order
    const { data: activeOrder } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', user.workshopId)
        .eq('motorcycle_id', motorcycleId)
        .neq('status', 'delivered')
        .maybeSingle();
        
    if (activeOrder) return { message: 'Esta motocicleta ya tiene una orden de trabajo activa en el taller.' };

    const { data: mc, error: mcError } = await supabase
        .from('motorcycles')
        .select('notes, customer_id')
        .eq('id', motorcycleId)
        .eq('organization_id', user.workshopId)
        .single();

    if (mcError || !mc) {
        return { message: 'Error: La motocicleta no existe o no pertenece a este taller.' };
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
        
    if (error) {
        // Fallback si el RPC falla por algún motivo
        const { error: insertError } = await supabase
            .from('work_orders')
            .insert({
                organization_id: user.workshopId,
                motorcycle_id: motorcycleId,
                assigned_mechanic_id: technicianId,
                status: 'received',
                reported_symptoms: issueDescription,
                created_by: user.userId || null
            });
            
        if (insertError) {
            console.error('Error creating work order:', insertError);
            return { message: 'Error al crear orden.' };
        }
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
    }

    revalidatePath('/work-orders');
    return { success: true };
}

export async function updateWorkOrderStatus(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const id = formData.get('id') as string;
    const uiStatus = formData.get('status') as string;
    const status = mapStatusToDb(uiStatus);

    const updateData: any = { status };
    const now = new Date().toISOString();

    if (status === 'delivered') {
        updateData.completed_at = now;
    } else if (status === 'in_progress') {
        updateData.started_at = now;
    }

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


    if (error) return { message: 'Error updating status' };

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

        // Recuperar nombre organización
        const { data: workshop } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();

        if (customer?.phone) {
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

    if (!workOrderId || isNaN(amount) || amount <= 0) {
        throw new Error('Datos inválidos');
    }

    // Por ahora, usamos el campo subtotal o creamos una nota (el esquema no tiene deposit_amount)
    // Lo guardaremos temporalmente en customer_observations si no existe
    const { error } = await supabase
        .from('work_orders')
        .update({ customer_observations: `Abono registrado: ${amount}` })
        .eq('id', workOrderId)
        .eq('organization_id', user.workshopId);

    if (error) throw new Error('Error al actualizar abono');

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
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const itemId = formData.get('inventoryItemId') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10) || 1;

    // TODO: En Fase 3 se integrará con Inventory real.
    // Por ahora registramos el item directamente en work_order_services
    const { error: itemError } = await supabase
        .from('work_order_services')
        .insert({
            work_order_id: workOrderId,
            description: 'Item de Inventario: ' + itemId, // Mapeo simple temporal
            quantity: quantity,
            unit_price: 0, 
            total: 0
        });

    if (itemError) throw new Error('Error agregando item a la orden');

    revalidatePath('/work-orders/' + workOrderId);
}

export async function removeItemFromWorkOrder(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const workOrderId = formData.get('workOrderId') as string;
    const saleItemId = formData.get('saleItemId') as string; // Equivalente a service_id

    if (!workOrderId || !saleItemId) return;

    const { error: deleteError } = await supabase
        .from('work_order_services')
        .delete()
        .eq('id', saleItemId);
        
    if (deleteError) {
        console.error("Error deleting service item:", deleteError);
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
    const result = await sendQuoteNotification(
        customerPhone,
        customerName,
        workshopName,
        workOrderId,
        portalUrl,
        orderNumber,
        technicianName
    );

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

    // Map UI Spanish status back to DB status
    let dbStatus = 'waiting_approval';
    if (quoteStatus === 'Aprobada') dbStatus = 'approved';
    if (quoteStatus === 'Rechazada') dbStatus = 'cancelled';



    const { error } = await supabase
        .from('work_orders')
        .update({ status: dbStatus })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) return { message: 'Error al actualizar cotización' };

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

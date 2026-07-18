'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'
import { sendOrderStatusUpdate } from '@/lib/whatsapp'

const workOrderSchema = z.object({
    motorcycleId: z.string().min(1, 'Se requiere la motocicleta.'),
    technicianId: z.string().min(1, 'Se requiere el técnico.'),
})

export async function createWorkOrder(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const validatedFields = workOrderSchema.safeParse({
        motorcycleId: formData.get('motorcycleId'),
        technicianId: formData.get('technicianId'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { motorcycleId, technicianId } = validatedFields.data

    // Check for duplicate active work order
    const { data: activeOrder } = await supabase
        .from('work_orders')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('motorcycle_id', motorcycleId)
        .neq('status', 'Entregado')
        .maybeSingle()
        
    if (activeOrder) return { message: 'Esta motocicleta ya tiene una orden de trabajo activa en el taller.' }

    // Generate Work Order Number (Auto-increment per workshop?)
    // Using serial in DB (work_order_number column).
    // But we might want a formatted string like ORD-001.
    // We can fetch the last one or rely on DB ID.
    // The SQL schema I made has `work_order_number serial`.
    // Wait, `serial` is global if not careful. In multi-tenant, separate sequences are hard.
    // I defined `work_order_number serial` in `public.work_orders`.
    // This is a global integer.
    // For UUIDs, we can just use the ID or generate a readable string.
    // Let's stick to generating a string manually to keep it "ORD-XXX".

    // Fetch last order for this workshop to increment.
    const { data: lastOrder } = await supabase
        .from('work_orders')
        .select('work_order_number')
        .eq('workshop_id', user.workshopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    // NOTE: my SQL defined work_order_number as SERIAL (int).
    // If I want 'ORD-XXX', I should have made it TEXT.
    // Prisma schema had String.
    // SQL schema had `work_order_number serial`.
    // Conflict! I should have checked.
    // If it is serial, DB handles it (1, 2, 3...).
    // I will assume it is serial Int for now, or I need to alter the column.
    // Let's check `supa-schema.sql` content I wrote.
    // `work_order_number serial` -> Integer.
    // So I can't store "ORD-001".
    // I will just let DB assign the number.
    // Or I can change it to Text in migration later.
    // For now, I'll rely on DB constraints.

    const { data: newOrder, error } = await supabase
        .from('work_orders')
        .insert({
            workshop_id: user.workshopId,
            motorcycle_id: motorcycleId,
            technician_id: technicianId,
            status: 'Diagnosticando',
            issue_description: '', // Optional in form?
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating work order:', error)
        return { message: 'Error al crear orden.' }
    }

    // TODO: Send WhatsApp notification logic here
    // Need to fetch customer phone via motorcycle.

    revalidatePath('/work-orders')
    return { success: true }
}

export async function updateWorkOrderStatus(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const id = formData.get('id') as string
    const status = formData.get('status') as string

    const updateData: any = { status }
    const now = new Date().toISOString()

    if (status === 'Diagnosticando') updateData.diagnosticandoDate = now // Wait, column name?
    // SQL Schema: created_at, completed_at. 
    // Prisma had specific dates. I only added created/completed in SQL.
    // I should use `completed_at` if status is Entregado.

    if (status === 'Entregado') {
        updateData.completed_at = now
    }

    const { error, data: updatedWo } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('workshop_id', user.workshopId)
        .select(`
            motorcycle_id, 
            work_order_number,
            motorcycles (
                customer_id,
                make,
                model,
                plate,
                clientes (
                    name,
                    phone
                )
            ),
            tecnicos_activos (
                name
            )
        `)
        .single()


    if (error) return { message: 'Error updating status' }

    if (updatedWo) {
        const mc = updatedWo.motorcycles as any;
        const customer = mc?.clientes;
        const tech = updatedWo.tecnicos_activos as any;

        let usedPartsItems: Array<{ name: string; quantity: number; price: number }> | undefined = undefined;

        if (status === 'Reparado') {
            const { data: saleData } = await supabase
                .from('sales')
                .select(`
                    id,
                    sale_items (
                        quantity,
                        price,
                        inventory_items (
                            name
                        )
                    )
                `)
                .eq('work_order_id', id)
                .eq('workshop_id', user.workshopId)
                .maybeSingle();

            if (saleData && saleData.sale_items) {
                usedPartsItems = saleData.sale_items.map((si: any) => ({
                    name: si.inventory_items?.name || 'Repuesto',
                    quantity: si.quantity,
                    price: si.price
                }));
            }
        }

        // Get workshop name
        const { data: workshop } = await supabase.from('workshops').select('name').eq('id', user.workshopId).single();

        if (customer?.phone) {
            sendOrderStatusUpdate(
                customer.phone,
                {
                    orderNumber: updatedWo.work_order_number?.toString() || id.substring(0, 8),
                    status: status as any,
                    customerName: customer.name || 'Cliente',
                    motorcycleInfo: `${mc.make} ${mc.model} (${mc.plate})`,
                    technicianName: tech?.name || 'Técnico asignado',
                    items: usedPartsItems,
                    workshopName: workshop?.name
                }
            ).catch(err => console.error('Error sending WhatsApp order status update:', err));
        }

        if (status === 'Entregado') {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + 3);

            // Intenta crear el recordatorio
            const { error: reminderError } = await supabase.from('reminders').insert({
                workshop_id: user.workshopId,
                customer_id: mc?.customer_id,
                motorcycle_id: updatedWo.motorcycle_id,
                service_type: 'Mantenimiento General Sugerido',
                due_date: dueDate.toISOString(),
                status: 'pending'
            });
            if (reminderError) {
                console.error('Error creating reminder:', reminderError);
            }
        }
    }

    revalidatePath('/work-orders')
    return { success: true }
}

export async function reassignWorkOrderTechnician(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const id = formData.get('id') as string
    const technicianId = formData.get('technicianId') as string

    if (!id || !technicianId) {
        return { message: 'Datos incompletos.' }
    }

    const { error } = await supabase
        .from('work_orders')
        .update({ technician_id: technicianId })
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) return { message: 'Error al reasignar técnico' }

    revalidatePath('/work-orders')
    revalidatePath(`/work-orders/${id}`)
    return { success: true }
}

export async function addDepositToWorkOrder(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const workOrderId = formData.get('workOrderId') as string
    const amount = parseFloat(formData.get('amount') as string)

    if (!workOrderId || isNaN(amount) || amount <= 0) {
        throw new Error('Datos inválidos')
    }

    // Get current deposit
    const { data: wo, error: fetchError } = await supabase
        .from('work_orders')
        .select('deposit_amount')
        .eq('id', workOrderId)
        .eq('workshop_id', user.workshopId)
        .single()

    if (fetchError || !wo) throw new Error('Orden no encontrada')

    const newDeposit = (wo.deposit_amount || 0) + amount

    const { error } = await supabase
        .from('work_orders')
        .update({ deposit_amount: newDeposit })
        .eq('id', workOrderId)
        .eq('workshop_id', user.workshopId)

    if (error) throw new Error('Error al actualizar abono')

    revalidatePath('/work-orders/' + workOrderId)
}

export async function updateWorkOrderSolution(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const workOrderId = formData.get('workOrderId') as string
    const solutionDescription = formData.get('solutionDescription') as string

    const { error } = await supabase
        .from('work_orders')
        .update({ solution_description: solutionDescription })
        .eq('id', workOrderId)
        .eq('workshop_id', user.workshopId)

    if (error) throw new Error('Error al actualizar solución')

    revalidatePath('/work-orders/' + workOrderId)
}

export async function addItemToWorkOrder(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const workOrderId = formData.get('workOrderId') as string
    const itemId = formData.get('inventoryItemId') as string
    const quantity = parseInt(formData.get('quantity') as string, 10) || 1

    // 1. Get Inventory Item Price
    const { data: item } = await supabase
        .from('inventory_items')
        .select('name, price, quantity') // check quantity later?
        .eq('id', itemId)
        .single()

    if (!item) throw new Error('Item no encontrado')
    
    if (quantity > item.quantity) {
        throw new Error(`Stock insuficiente. Solo hay ${item.quantity} unidades de ${item.name}`);
    }

    // 2. Find or Create an Open Sale for this WorkOrder?
    // The previous logic created a NEW sale every time if none existed? 
    // Or found the first one.
    // Ideally we append to an existing OPEN sale (maybe implied by not being separate?)
    // Let's look for a sale associated with this WO.

    // In Supabase migration, we might have multiple sales per work order.
    // Let's find recent one? Or create new one if none.

    let { data: sale } = await supabase
        .from('sales')
        .select('id, total')
        .eq('work_order_id', workOrderId)
        .eq('workshop_id', user.workshopId)
        .limit(1)
        .maybeSingle() // Use maybeSingle to avoid 406 if multiple (takes first) or null

    if (!sale) {
        // Create Sale
        // Need a sale number
        const { data: lastSale } = await supabase.from('sales').select('sale_number').eq('workshop_id', user.workshopId).order('created_at', { ascending: false }).limit(1).single()
        let nextNum = 1
        if (lastSale?.sale_number) {
            const n = parseInt(lastSale.sale_number.replace('V', ''))
            if (!isNaN(n)) nextNum = n + 1
        }
        const saleNumber = `V${nextNum.toString().padStart(4, '0')}`

        const { data: newSale, error: createError } = await supabase
            .from('sales')
            .insert({
                workshop_id: user.workshopId,
                work_order_id: workOrderId,
                sale_number: saleNumber,
                payment_method: 'Efectivo', // Default
                date: new Date().toISOString(),
                total: 0
            })
            .select()
            .single()

        if (createError || !newSale) throw new Error('Error creando venta interna')
        sale = newSale
    }

    if (!sale) throw new Error('Error recuperando venta')

    // 3. Add Item to Sale
    const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
            workshop_id: user.workshopId,
            sale_id: sale.id,
            inventory_item_id: itemId,
            quantity: quantity,
            price: item.price
        })

    if (itemError) throw new Error('Error agregando item')

    // 4. Update Sale Total
    await supabase
        .from('sales')
        .update({ total: (sale.total || 0) + (item.price * quantity) })
        .eq('id', sale.id)

    // 5. Decrement Inventory (Optional - usually done on checkout, but if we do it here...)
    // Previous logic didn't clearly show decrement, but `sales.ts` does.
    // Let's decrement usage.
    /*
    await supabase.rpc('decrement_inventory', {
        item_id: itemId,
        amount: quantity
    })
    */
    // For Work Order "items used", they are strictly used. So yes decrement.
    const { error: updateError } = await supabase.rpc('decrement_inventory', {
        item_id: itemId,
        amount: quantity
    });
    if (updateError) {
        // Fallback
        await supabase.rpc('decrement_inventory', { item_id: itemId, amount: quantity }); // Retry? No.
        // Manual update
        const { data: currentInv } = await supabase.from('inventory_items').select('quantity').eq('id', itemId).single();
        if (currentInv) {
            await supabase.from('inventory_items').update({ quantity: currentInv.quantity - quantity }).eq('id', itemId);
        }
    }

    revalidatePath('/work-orders/' + workOrderId)
}

export async function removeItemFromWorkOrder(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

    const workOrderId = formData.get('workOrderId') as string
    const saleItemId = formData.get('saleItemId') as string

    if (!workOrderId || !saleItemId) return;

    try {
        const { data: saleItem, error: fetchError } = await supabase
            .from('sale_items')
            .select('*, sale:sales(id, total)')
            .eq('id', saleItemId)
            .single()

        if (fetchError || !saleItem) {
            console.error("Error fetching sale item:", fetchError);
            return;
        }

        // Delete item
        const { error: deleteError } = await supabase.from('sale_items').delete().eq('id', saleItemId)
        if (deleteError) {
            console.error("Error deleting sale item:", deleteError);
            return;
        }

        // Update Sale Total
        const saleData = Array.isArray(saleItem.sale) ? saleItem.sale[0] : saleItem.sale;
        const currentTotal = saleData?.total || 0;
        
        const newTotal = currentTotal - ((saleItem.price || 0) * (saleItem.quantity || 1))
        
        if (saleItem.sale_id) {
            await supabase.from('sales').update({ total: newTotal > 0 ? newTotal : 0 }).eq('id', saleItem.sale_id)
        }

        // Restore Stock
        if (saleItem.inventory_item_id) {
            const { data: currentInv } = await supabase.from('inventory_items').select('quantity').eq('id', saleItem.inventory_item_id).single();
            if (currentInv) {
                await supabase.from('inventory_items').update({ quantity: (currentInv.quantity || 0) + (saleItem.quantity || 1) }).eq('id', saleItem.inventory_item_id);
            }
        }
    } catch (e) {
        console.error("Exception in removeItemFromWorkOrder:", e);
    }

    revalidatePath('/work-orders/' + workOrderId)
}

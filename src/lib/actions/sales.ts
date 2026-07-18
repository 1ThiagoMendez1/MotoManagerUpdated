'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'
import { sendServiceSaleNotification, sendSaleNotification } from '@/lib/whatsapp'

// --- Schemas ---

const serviceSaleSchema = z.object({
    workOrderId: z.string().min(1, 'Se requiere la orden de trabajo.'),
    laborCost: z.coerce.number().min(0, "El costo no puede ser negativo."),
    paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Wompi', 'Otros'], {
        required_error: "Se requiere seleccionar un medio de pago.",
    }),
    date: z.string({
        required_error: "Se requiere una fecha.",
    }),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, "Selecciona un producto"),
        quantity: z.coerce.number().int().min(1, "Mínimo 1"),
        price: z.coerce.number(),
    })).optional(),
    discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

const directSaleSchema = z.object({
    customerId: z.string().optional(),
    cedula: z.string().optional(),
    customerName: z.string().optional(),
    phone: z.string().optional(),
    paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Wompi', 'Otros'], {
        required_error: "Se requiere seleccionar un medio de pago.",
    }),
    date: z.string({ required_error: "Se requiere una fecha." }),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, "Selecciona un producto"),
        quantity: z.coerce.number().int().min(1, "Mínimo 1"),
        price: z.coerce.number(),
    })).min(1, "Agrega al menos un producto."),
    discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

// --- Helper Functions ---

async function generateSaleNumber(supabase: any, workshopId: string, prefix: 'V' | 'VS') {
    // Find last sale number specifically for this prefix
    const { data: lastSale } = await supabase
        .from('sales')
        .select('sale_number')
        .eq('workshop_id', workshopId)
        .ilike('sale_number', `${prefix}%`) // Filter by prefix
        .order('created_at', { ascending: false }) // Get mostly recently created
        .limit(1)
        .maybeSingle()

    let nextNumber = 1
    if (lastSale && lastSale.sale_number) {
        // Extract number from string like "VS1" or "V10"
        const lastNumStr = lastSale.sale_number.replace(prefix, '')
        const lastNum = parseInt(lastNumStr)
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1
        }
    }

    return `${prefix}${nextNumber}`
}

// --- Actions ---

export async function createServiceSale(prevState: any, formData: FormData) {
    console.log('createServiceSale started');
    const user = await requireWorkshop()

    const supabase = await createClient()

    try {
        const itemsRaw = formData.get('items') as string
        const items = JSON.parse(itemsRaw || '[]')
        const workOrderId = formData.get('workOrderId') as string
        const laborCost = parseFloat(formData.get('laborCost') as string)
        const paymentMethod = formData.get('paymentMethod') as string
        const date = formData.get('date') as string
        const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0

        const validatedFields = serviceSaleSchema.safeParse({
            workOrderId,
            laborCost,
            paymentMethod,
            date,
            items,
            discountPercentage,
        })

        if (!validatedFields.success) {
            console.error('Validation failed:', validatedFields.error.flatten());
            return {
                errors: validatedFields.error.flatten().fieldErrors,
            }
        }

        const data = validatedFields.data

        // 1. Generate Sale Number with 'VS' prefix
        const saleNumber = await generateSaleNumber(supabase, user.workshopId, 'VS')
        console.log('Generated Service Sale Number:', saleNumber);

        // 2. Check Inventory
        for (const item of data.items || []) {
            const { data: invItem } = await supabase
                .from('inventory_items')
                .select('quantity, name')
                .eq('id', item.inventoryItemId)
                .single()

            if (!invItem || invItem.quantity < item.quantity) {
                return { message: `Stock insuficiente para ${invItem?.name || 'producto'}.` }
            }
        }

        // 3. Calculate Totals
        const itemsTotal = (data.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const subtotal = itemsTotal + data.laborCost
        const discountAmount = itemsTotal * ((data.discountPercentage || 0) / 100)
        const total = subtotal - discountAmount

        // 4. Create Sale Record
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                workshop_id: user.workshopId,
                sale_number: saleNumber,
                work_order_id: data.workOrderId,
                payment_method: data.paymentMethod,
                date: data.date, // ISO string
                total: total,
            })
            .select()
            .single()

        if (saleError) {
            console.error('Error creating sale record:', saleError)
            return { message: 'Error al crear el registro de venta: ' + saleError.message }
        }

        // 5. Create Sale Items & Update Inventory
        for (const item of data.items || []) {
            const { error: itemError } = await supabase
                .from('sale_items')
                .insert({
                    workshop_id: user.workshopId,
                    sale_id: sale.id,
                    inventory_item_id: item.inventoryItemId,
                    quantity: item.quantity,
                    price: item.price
                })

            if (itemError) {
                console.error('Error creating sale item:', itemError)
                continue
            }

            // Decrement stock
            const { error: updateError } = await supabase.rpc('decrement_inventory', {
                item_id: item.inventoryItemId,
                amount: item.quantity
            });
            // Fallback
            if (updateError) {
                const { data: currentInv } = await supabase.from('inventory_items').select('quantity').eq('id', item.inventoryItemId).single();
                if (currentInv) {
                    await supabase.from('inventory_items').update({ quantity: currentInv.quantity - item.quantity }).eq('id', item.inventoryItemId);
                }
            }
        }

        // 6. Update Work Order Status
        const { data: workOrder } = await supabase
            .from('work_orders')
            .update({
                status: 'Entregado',
                entregado_date: new Date().toISOString(),
                completed_at: new Date().toISOString() // Fixed completed_date to completed_at matching schema likely
            })
            .eq('id', data.workOrderId)
            .select(`
            *,
            motorcycle:motorcycles (
                *,
                customer:clientes (*)
            ),
            technician:tecnicos_activos (*)
        `)
            .single()

        // 7. Send Notification
        if (workOrder?.motorcycle?.customer?.phone) {
            const depositAmount = workOrder.deposit_amount || 0;
            // Catch notification errors so they don't block the sale
            try {
                const { data: workshop } = await supabase.from('workshops').select('name').eq('id', user.workshopId).single();
                await sendServiceSaleNotification(
                    workOrder.motorcycle.customer.phone,
                    workOrder.motorcycle.customer.name,
                    saleNumber,
                    total,
                    {
                        make: workOrder.motorcycle.make,
                        model: workOrder.motorcycle.model,
                        plate: workOrder.motorcycle.plate
                    },
                    workOrder.technician?.name || 'Sin técnico',
                    data.laborCost > 0 ? data.laborCost : undefined,
                    data.items?.map(i => {
                        return { name: 'Repuesto', quantity: i.quantity, price: i.price }
                    }),
                    subtotal,
                    data.discountPercentage || 0,
                    discountAmount,
                    workshop?.name
                )
            } catch (notifyError) {
                console.error('Notification error:', notifyError);
            }
        }

        revalidatePath('/sales')

        // Return formatted sale object for the UI (ReceiptDialog)
        const { data: fullSale } = await supabase
            .from('sales')
            .select(`
            *,
            sale_items (
                *,
                inventory_item:inventory_items (*)
            ),
            work_order:work_orders (
                *,
                motorcycle:motorcycles (
                    *,
                    customer:clientes (*)
                ),
                technician:tecnicos_activos (*)
            )
        `)
            .eq('id', sale.id)
            .single()

        if (!fullSale) return { success: true }

        const formattedSale = {
            id: fullSale.id,
            saleNumber: fullSale.sale_number,
            date: fullSale.date,
            subtotal: subtotal,
            discountPercentage: data.discountPercentage,
            discountAmount: discountAmount,
            total: fullSale.total,
            paymentMethod: fullSale.payment_method,
            workOrderId: fullSale.work_order?.work_order_number,
            customerName: fullSale.work_order?.motorcycle?.customer?.name,
            motorcycleInfo: fullSale.work_order ? {
                make: fullSale.work_order.motorcycle.make,
                model: fullSale.work_order.motorcycle.model,
                year: fullSale.work_order.motorcycle.year,
                plate: fullSale.work_order.motorcycle.plate,
            } : undefined,
            technicianName: fullSale.work_order?.technician?.name,
            laborCost: data.laborCost > 0 ? data.laborCost : undefined,
            items: fullSale.sale_items?.map((item: any) => ({
                name: item.inventory_item?.name,
                sku: item.inventory_item?.sku,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
            })) || []
        }

        return { success: true, sale: formattedSale }

    } catch (error: any) {
        console.error('Error creating service sale:', error)
        return { message: 'Error al crear la venta de servicio: ' + (error.message || error) }
    }
}

export async function createDirectSale(prevState: any, formData: FormData) {
    console.log('createDirectSale started');
    const user = await requireWorkshop()
    const supabase = await createClient()

    try {
        const itemsRaw = formData.get('items') as string
        const items = JSON.parse(itemsRaw || '[]')
        const customerId = formData.get('customerId')?.toString() || undefined
        const cedula = formData.get('cedula')?.toString() || undefined
        const customerName = formData.get('customerName')?.toString() || undefined
        const phone = formData.get('phone')?.toString() || undefined
        const paymentMethod = formData.get('paymentMethod') as string
        const date = formData.get('date') as string
        const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0

        const validatedFields = directSaleSchema.safeParse({
            customerId,
            cedula,
            customerName,
            phone,
            paymentMethod,
            date,
            items,
            discountPercentage,
        })

        if (!validatedFields.success) {
            console.error('Direct Sale Validation Failed:', validatedFields.error.flatten());
            return { errors: validatedFields.error.flatten().fieldErrors }
        }

        const data = validatedFields.data

        // 1. Handle Customer
        let finalCustomerId = data.customerId
        if (!finalCustomerId && data.cedula && data.customerName) {
            // Check existing
            const { data: existing } = await supabase
                .from('clientes')
                .select('id')
                .eq('workshop_id', user.workshopId)
                .eq('cedula', data.cedula)
                .maybeSingle() // Use maybeSingle

            if (existing) {
                finalCustomerId = existing.id
            } else {
                // Create new
                const { data: newCustomer, error: createError } = await supabase
                    .from('clientes')
                    .insert({
                        workshop_id: user.workshopId,
                        name: data.customerName,
                        cedula: data.cedula,
                        phone: data.phone,
                        email: `${data.cedula}@temp.com` // Placeholder
                    })
                    .select()
                    .single()

                if (createError) {
                    console.error('Error creating customer for direct sale:', createError)
                    return { message: 'Error al crear el cliente: ' + createError.message }
                }
                finalCustomerId = newCustomer.id
            }
        }

        // 2. Generate Number with 'V' prefix
        const saleNumber = await generateSaleNumber(supabase, user.workshopId, 'V')
        console.log('Generated Direct Sale Number:', saleNumber);

        // 3. Check Inventory
        for (const item of data.items || []) {
            const { data: invItem } = await supabase
                .from('inventory_items')
                .select('quantity, name')
                .eq('id', item.inventoryItemId)
                .single()

            if (!invItem || invItem.quantity < item.quantity) {
                return { message: `Stock insuficiente para ${invItem?.name || 'producto'}.` }
            }
        }

        // 4. Calculate Totals
        const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const discountAmount = subtotal * ((data.discountPercentage || 0) / 100)
        const total = subtotal - discountAmount

        // 5. Create Sale
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                workshop_id: user.workshopId,
                sale_number: saleNumber,
                customer_id: finalCustomerId,
                payment_method: data.paymentMethod,
                date: data.date,
                total: total,
            })
            .select()
            .single()

        if (saleError) {
            console.error('Error creating direct sale:', saleError)
            return { message: 'Error al crear la venta directa: ' + saleError.message }
        }

        // 6. Items & Inventory
        for (const item of data.items) {
            await supabase
                .from('sale_items')
                .insert({
                    workshop_id: user.workshopId,
                    sale_id: sale.id,
                    inventory_item_id: item.inventoryItemId,
                    quantity: item.quantity,
                    price: item.price
                })

            // Decrement stock
            const { error: updateError } = await supabase.rpc('decrement_inventory', {
                item_id: item.inventoryItemId,
                amount: item.quantity
            });
            if (updateError) {
                const { data: currentInv } = await supabase.from('inventory_items').select('quantity').eq('id', item.inventoryItemId).single();
                if (currentInv) {
                    await supabase.from('inventory_items').update({ quantity: currentInv.quantity - item.quantity }).eq('id', item.inventoryItemId);
                }
            }
        }

        // 7. Notification
        try {
            if (data.phone || (finalCustomerId && data.cedula)) {
                // Retrieve customer phone if we only had ID
                let phoneToUse = data.phone
                let nameToUse = data.customerName

                if (!phoneToUse && finalCustomerId) {
                    const { data: cust } = await supabase.from('clientes').select('phone, name').eq('id', finalCustomerId).single()
                    if (cust) {
                        phoneToUse = cust.phone
                        nameToUse = cust.name
                    }
                }

                // Get workshop name
                const { data: workshop } = await supabase.from('workshops').select('name').eq('id', user.workshopId).single();
                
                if (phoneToUse) {
                    await sendSaleNotification(
                        phoneToUse,
                        nameToUse || 'Cliente',
                        saleNumber,
                        total,
                        data.items.map(i => ({ name: i.name || 'Producto', quantity: i.quantity, price: i.price })),
                        subtotal,
                        data.discountPercentage || 0,
                        discountAmount,
                        workshop?.name
                    )
                }
            }
        } catch (notifyError) {
            console.error('Direct sale notification error:', notifyError);
        }

        revalidatePath('/sales')

        // Return formatted sale
        const { data: fullSale } = await supabase
            .from('sales')
            .select(`
                *,
                sale_items (
                    *,
                    inventory_item:inventory_items (*)
                ),
                customer:clientes (*)
            `)
            .eq('id', sale.id)
            .single()

        const formattedSale = {
            id: fullSale.id,
            saleNumber: fullSale.sale_number,
            date: fullSale.date,
            subtotal: subtotal,
            discountPercentage: data.discountPercentage,
            discountAmount: discountAmount,
            total: fullSale.total,
            paymentMethod: fullSale.payment_method,
            customerName: fullSale.customer?.name || fullSale.customer_name || 'Cliente de Mostrador',
            items: fullSale.sale_items?.map((item: any) => ({
                name: item.inventory_item?.name,
                sku: item.inventory_item?.sku,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
            })) || []
        }

        return { success: true, sale: formattedSale }


    } catch (error: any) {
        console.error('Error creating direct sale:', error)
        return { message: 'Error al crear la venta directa: ' + (error.message || error) }
    }
}

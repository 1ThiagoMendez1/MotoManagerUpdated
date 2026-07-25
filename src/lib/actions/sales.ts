'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendServiceSaleNotification, sendSaleNotification } from '@/lib/whatsapp';

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
        fromWorkOrder: z.boolean().optional(),
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

function mapPaymentMethodToDb(uiMethod: string) {
    if (uiMethod === 'Efectivo') return 'cash';
    if (uiMethod === 'Tarjeta') return 'credit_card';
    if (uiMethod === 'Nequi' || uiMethod === 'DaviPlata' || uiMethod === 'transfer') return 'transfer';
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

    try {
        const itemsRaw = formData.get('items') as string;
        const items = JSON.parse(itemsRaw || '[]');
        const workOrderId = formData.get('workOrderId') as string;
        const laborCost = parseFloat(formData.get('laborCost') as string);
        const paymentMethod = formData.get('paymentMethod') as string;
        const date = formData.get('date') as string;
        const discountPercentage = parseFloat(formData.get('discountPercentage') as string) || 0;

        const validatedFields = serviceSaleSchema.safeParse({
            workOrderId,
            laborCost,
            paymentMethod,
            date,
            items,
            discountPercentage,
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
        const itemsTotal = (data.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotal = itemsTotal + data.laborCost;
        const discountAmount = itemsTotal * ((data.discountPercentage || 0) / 100);
        const total = subtotal - discountAmount;

        // 4. Create or Update Sale Record
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
                    status: 'paid',
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
                    status: 'paid',
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
        for (const item of data.items || []) {
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
                    description: 'Producto', // Fallback temporal
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

        // Registrar mano de obra como item de servicio si aplica
        if (data.laborCost > 0) {
             await supabase
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    item_type: 'service',
                    description: 'Mano de Obra / Servicio',
                    quantity: 1,
                    unit_price: data.laborCost,
                    total: data.laborCost
                });
        }

        // 6. Update Work Order Status
        const { data: workOrder, error: workOrderError } = await supabase
            .from('work_orders')
            .update({
                status: 'delivered',
                quote_status: 'approved',
                completed_at: new Date().toISOString()
            })
            .eq('id', data.workOrderId)
            .eq('organization_id', user.workshopId)
            .select(`
                motorcycle_id, 
                order_number,
                customer_observations,
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

        if (workOrderError) {
            console.error('Error updating work order status:', workOrderError);
        }

        // 7. Send Notification
        if (workOrder) {
            const mc = Array.isArray(workOrder.motorcycles) ? workOrder.motorcycles[0] : workOrder.motorcycles;
            const customer = mc?.customers;
            const tech = Array.isArray(workOrder.profiles) ? workOrder.profiles[0] : workOrder.profiles;
            
            if (customer?.phone) {
                try {
                    const { data: org } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();
                    await sendServiceSaleNotification(
                        customer.phone,
                        `${customer.first_name} ${customer.last_name}`.trim(),
                        saleNumber,
                        total,
                        { make: mc?.brand, model: mc?.model, plate: mc?.license_plate },
                        tech ? `${tech.first_name} ${tech.last_name}` : 'Técnico',
                        data.laborCost > 0 ? data.laborCost : undefined,
                        data.items?.map(i => ({ name: 'Repuesto', quantity: i.quantity, price: i.price })),
                        subtotal,
                        data.discountPercentage || 0,
                        discountAmount,
                        org?.name
                    );
                } catch (notifyError) {
                    console.error('Notification error:', notifyError);
                }
            }
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

        // Parse deposit amount from work order customer_observations
        let parsedDeposit = 0;
        if (wo?.customer_observations) {
            const match = wo.customer_observations.match(/Abono registrado:\s*(\d+(\.\d+)?)/);
            if (match) {
                parsedDeposit = parseFloat(match[1]);
            }
        }

        const formattedItems = saleItems ? saleItems.filter((i:any) => i.item_type === 'inventory').map((item: any) => ({
            name: item.inventory_items?.name || item.description || 'Producto',
            sku: item.inventory_items?.code || '-',
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total || (item.quantity * item.unit_price),
        })) : (data.items || []).map((item: any) => ({
            name: item.name || 'Producto',
            sku: item.sku || '-',
            quantity: item.quantity,
            price: item.price,
            total: item.total || (item.quantity * item.price)
        }));

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
            paymentMethod: mapPaymentMethodToUi(dbPaymentMethod),
            workOrderId: wo?.order_number,
            customerName: formattedCustomer ? `${formattedCustomer.first_name} ${formattedCustomer.last_name}`.trim() : undefined,
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
                status: 'paid',
                created_by: user.userId || null
            })
            .select()
            .single();

        if (saleError) return { message: 'Error al crear la venta directa: ' + saleError.message };

        // 6. Items & Inventory
        for (const item of data.items) {
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

        // 7. Notification
        try {
            if (finalCustomerPhone) {
                const { data: org } = await supabase.from('organizations').select('name').eq('id', user.workshopId).single();
                await sendSaleNotification(
                    finalCustomerPhone,
                    finalCustomerName || 'Cliente',
                    saleNumber,
                    total,
                    data.items.map(i => ({ name: 'Producto', quantity: i.quantity, price: i.price })),
                    subtotal,
                    data.discountPercentage || 0,
                    discountAmount,
                    org?.name
                );
            }
        } catch (notifyError) {
            console.error('Direct sale notification error:', notifyError);
        }

        revalidatePath('/sales');
        revalidatePath('/inventory');
        revalidatePath('/', 'layout');

        // Return formatted sale
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
                paymentMethod: mapPaymentMethodToUi(sale.payment_method),
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
            paymentMethod: mapPaymentMethodToUi(fullSale.payment_method),
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

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
    paymentMethod: z.enum(['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros', 'Wompi'], {
        required_error: "Se requiere seleccionar un medio de pago.",
    }),
    date: z.string({
        required_error: "Se requiere una fecha.",
    }),
    items: z.array(z.object({
        inventoryItemId: z.string().min(1, "Selecciona un producto"),
        quantity: z.coerce.number().int().min(1, "Mínimo 1"),
        price: z.coerce.number().finite().min(0),
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
    paymentMethod: z.enum(['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros', 'Wompi'], {
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
    if (uiMethod === 'Nequi') return 'nequi';
    if (uiMethod === 'DaviPlata') return 'daviplata';
    if (uiMethod === 'Transferencia') return 'transfer';
    if (uiMethod === 'Otros') return 'other';
    if (uiMethod === 'Wompi') return 'wompi';
    return 'other'; // Addi, Otros
}

function mapPaymentMethodToUi(dbMethod: string) {
    if (dbMethod === 'cash') return 'Efectivo';
    if (dbMethod === 'credit_card' || dbMethod === 'debit_card') return 'Tarjeta';
    if (dbMethod === 'nequi') return 'Nequi';
    if (dbMethod === 'daviplata') return 'DaviPlata';
    if (dbMethod === 'transfer') return 'Transferencia';
    if (dbMethod === 'wompi') return 'Wompi';
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
    const user = await requireWorkshop();
    const supabase = await createClient();
    try {
        const validation = serviceSaleSchema.safeParse({
            workOrderId: formData.get('workOrderId'),
            laborCost: formData.get('laborCost'), paymentMethod: formData.get('paymentMethod'),
            date: formData.get('date'), items: JSON.parse(String(formData.get('items') || '[]')),
            discountPercentage: formData.get('discountPercentage') || 0,
        });
        const requestId = z.string().uuid().safeParse(formData.get('requestId'));
        if (!validation.success) return { success: false, message: validation.error.issues[0].message };
        if (!requestId.success) return { success: false, message: 'Recarga el formulario e intenta de nuevo.' };
        const data = validation.data;
        const { data: sale, error } = await supabase.rpc('finalize_work_order_service_sale', {
            p_org: user.workshopId, p_work_order: data.workOrderId, p_labor: data.laborCost,
            p_discount: data.discountPercentage || 0, p_method: mapPaymentMethodToDb(data.paymentMethod),
            p_date: data.date, p_items: (data.items || []).filter(item => item.type !== 'service'),
            p_request_id: requestId.data,
        });
        if (error) throw new Error(error.message);
        if (!sale) throw new Error('No se recibió el comprobante de la venta.');
        const [woResult, itemsResult, orgResult] = await Promise.all([
            supabase.from('work_orders').select(`order_number, motorcycles(brand,model,license_plate,model_year,customers(first_name,last_name,phone)),
                profiles!work_orders_assigned_mechanic_id_fkey(first_name,last_name)`).eq('id', data.workOrderId).eq('organization_id', user.workshopId).single(),
            supabase.from('sale_items').select('*, inventory_items(name,code)').eq('sale_id', sale.id),
            supabase.from('organizations').select('name').eq('id', user.workshopId).single(),
        ]);
        const first = (v: any) => Array.isArray(v) ? v[0] : v;
        const wo: any = woResult.data;
        const moto = first(wo?.motorcycles);
        const customer = first(moto?.customers);
        const tech = first(wo?.profiles);
        const labor = (itemsResult.data || []).filter((i: any) => i.item_type === 'service').reduce((sum: number, i: any) => sum + Number(i.total), 0);
        const items = (itemsResult.data || []).map((i: any) => ({
            name: i.inventory_items?.name || i.description || 'Servicio', sku: i.inventory_items?.code || 'SRV',
            quantity: Number(i.quantity), price: Number(i.unit_price), total: Number(i.total), type: i.item_type,
        }));
        const gross = Number(sale.invoice_total ?? (Number(sale.total) + Number(sale.deposit_amount || 0)));
        const receipt = {
            id: sale.id, saleNumber: sale.sale_number, date: sale.created_at,
            subtotal: Number(sale.subtotal), discountPercentage: data.discountPercentage,
            discountAmount: Number(sale.discount_total), depositAmount: Number(sale.deposit_amount || 0),
            remainingBalance: Number(sale.total), total: gross, paymentMethod: mapPaymentMethodToUi(sale.payment_method),
            workOrderId: wo?.order_number, customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : undefined,
            workshopName: orgResult.data?.name || 'MotoManager',
            motorcycleInfo: moto ? { make: moto.brand, model: moto.model, year: moto.model_year, plate: moto.license_plate } : undefined,
            technicianName: tech ? `${tech.first_name} ${tech.last_name}`.trim() : undefined, laborCost: labor, items,
        };
        for (const path of ['/sales', '/accounting', '/customers', '/motorcycles', '/work-orders', `/work-orders/${data.workOrderId}`]) revalidatePath(path);
        revalidatePath('/', 'layout');
        if (sale.status === 'paid' && !sale.repeated && customer?.phone) {
            try {
                if (await checkAndUpdateWhatsAppLimit(user.workshopId)) {
                    await sendServiceSaleNotification(customer.phone, receipt.customerName || 'Cliente', wo.order_number,
                        gross, { make: moto.brand || 'Moto', model: moto.model || '', plate: moto.license_plate || 'Sin placa' },
                        receipt.technicianName || 'Técnico', labor || undefined, items, receipt.subtotal,
                        data.discountPercentage, receipt.discountAmount, receipt.workshopName);
                }
            } catch (notificationError) { console.error('No se pudo enviar el comprobante de servicio.', notificationError); }
        }
        return { success: true, sale: receipt };
    } catch (error: any) {
        return { success: false, message: 'No se pudo registrar la venta: ' + (error.message || 'Error inesperado.') };
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
        const itemsToTrack = new Map<string, { locationId: string, amount: number }[]>();

        for (const item of data.items || []) {
            if (item.type === 'service') continue;
            
            const itemId = item.inventoryItemId;
            if (!itemId) {
                return { message: 'El ID del producto es requerido.' };
            }

            const { data: invItem, error: invError } = await supabase
                .from('inventory_items')
                .select('name, track_inventory')
                .eq('id', itemId)
                .single();

            if (invError) {
                console.error('Error fetching inventory item for sale. Item ID:', itemId, 'Error:', invError);
                return { message: `Error BD: ${invError.message}. ID: ${itemId}` };
            }

            if (!invItem) {
                return { message: `Producto no encontrado. ID: ${itemId}` };
            }

            if (invItem.track_inventory !== false) {
                const { data: stockData } = await supabase
                    .from('inventory_item_stock')
                    .select('quantity, location_id')
                    .eq('item_id', itemId)
                    .order('quantity', { ascending: false });
                
                let remainingToDeduct = item.quantity;
                const plan: { locationId: string, amount: number }[] = [];

                if (stockData) {
                    for (const stock of stockData) {
                        if (remainingToDeduct <= 0) break;
                        const available = Number(stock.quantity);
                        if (available > 0) {
                            const deduct = Math.min(available, remainingToDeduct);
                            plan.push({ locationId: stock.location_id, amount: deduct });
                            remainingToDeduct -= deduct;
                        }
                    }
                }

                if (remainingToDeduct > 0) {
                    return { message: `Stock insuficiente para ${invItem.name}.` };
                }
                
                itemsToTrack.set(itemId, plan);
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
                const itemId = item.inventoryItemId;
                if (!itemId) {
                    throw new Error('El ID del producto es requerido.');
                }

                const { error: itemError } = await supabase
                    .from('sale_items')
                    .insert({
                        sale_id: sale.id,
                        item_type: 'inventory',
                        inventory_item_id: itemId,
                        description: item.name || 'Producto',
                        quantity: item.quantity,
                        unit_price: item.price,
                        total: item.price * item.quantity
                    });

                if (itemError) {
                    console.error('Error inserting sale item:', itemError);
                    throw new Error(`Error al insertar el producto ${item.name || 'producto'}`);
                }

                // Decrement inventory only if tracked
                // Decrement inventory using deduction plan
                const plan = itemsToTrack.get(itemId);
                if (plan) {
                    for (const deduction of plan) {
                        const { error: updateError } = await supabase.rpc('decrement_inventory', {
                            p_item_id: itemId,
                            p_amount: deduction.amount,
                            p_location_id: deduction.locationId,
                            p_sale_id: sale.id,
                            p_user_id: user.userId
                        });
                        if (updateError) {
                            console.error('RPC Error:', updateError);
                            throw new Error(`Error al descontar inventario. Detalle: ${updateError.message}`);
                        }
                    }
                }
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

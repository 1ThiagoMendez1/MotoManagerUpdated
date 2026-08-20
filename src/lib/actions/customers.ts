'use server';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const customerSchema = z.object({
    name: z.string().min(1, "El nombre es requerido."),
    email: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim().toLowerCase()),
      z.string().email("El email debe ser válido.").optional()
    ),
    phone: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
      z.string().optional()
    ),
    cedula: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
      z.string().optional()
    ),
});

// Helper para separar nombres (ya que el schema pide first_name y last_name pero el form envía name)
function splitName(fullName: string) {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'N/A';
    return { firstName, lastName };
}

export async function createCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient(); // Cliente real

    const validatedFields = customerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        cedula: formData.get('cedula'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, email, phone, cedula } = validatedFields.data;
    const { firstName, lastName } = splitName(name);

    if (cedula) {
        const { data: existingCedula, error: cedulaError } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('document_number', cedula)
            .maybeSingle();
            
        if (cedulaError) {
            console.error('❌ [createCustomer] Error verificando cédula:', cedulaError);
            return { message: 'Error al verificar la cédula: ' + cedulaError.message };
        }
        if (existingCedula) return { message: 'Ya existe un cliente con esta cédula.' };
    }

    if (email) {
        const { data: existingEmail, error: emailError } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('email', email)
            .maybeSingle();
            
        if (emailError) {
            console.error('❌ [createCustomer] Error verificando email:', emailError);
            return { message: 'Error al verificar el correo electrónico: ' + emailError.message };
        }
        if (existingEmail) return { message: 'Ya existe un cliente con este correo electrónico.' };
    }

    const { error } = await supabase
        .from('customers')
        .insert({
            organization_id: user.workshopId,
            first_name: firstName,
            last_name: lastName,
            document_number: cedula || null,
            email: email || null,
            phone: phone || null,
            created_by: user.userId || null
        });

    if (error) {
        console.error('❌ [createCustomer] Error insertando cliente:', error);
        return { message: 'Error al crear el cliente: ' + error.message };
    }

    revalidatePath('/customers');
    revalidatePath('/customers', 'page');
    revalidatePath('/motorcycles');
    revalidatePath('/sales');
    revalidatePath('/work-orders');
    revalidatePath('/', 'layout');
    return { success: true };
}


export async function updateCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const id = formData.get('id') as string;

    if (!id) return { message: 'ID requerido' };

    const validatedFields = customerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        cedula: formData.get('cedula'),
    });

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, email, phone, cedula } = validatedFields.data;
    const { firstName, lastName } = splitName(name);

    if (cedula) {
        const { data: existingCedula, error: cedulaError } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('document_number', cedula)
            .neq('id', id)
            .maybeSingle();
            
        if (cedulaError) {
            console.error('❌ [updateCustomer] Error verificando cédula:', cedulaError);
            return { message: 'Error al verificar la cédula: ' + cedulaError.message };
        }
        if (existingCedula) return { message: 'Ya existe otro cliente con esta cédula.' };
    }

    if (email) {
        const { data: existingEmail, error: emailError } = await supabase
            .from('customers')
            .select('id')
            .eq('organization_id', user.workshopId)
            .eq('email', email)
            .neq('id', id)
            .maybeSingle();
            
        if (emailError) {
            console.error('❌ [updateCustomer] Error verificando email:', emailError);
            return { message: 'Error al verificar el correo electrónico: ' + emailError.message };
        }
        if (existingEmail) return { message: 'Ya existe otro cliente con este correo electrónico.' };
    }

    const { error } = await supabase
        .from('customers')
        .update({
            first_name: firstName,
            last_name: lastName,
            document_number: cedula || null,
            email: email || null,
            phone: phone || null
        })
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        console.error('❌ [updateCustomer] Error actualizando cliente:', error);
        return { message: 'Error al actualizar: ' + error.message };
    }

    revalidatePath('/customers');
    revalidatePath('/customers', 'page');
    revalidatePath('/motorcycles');
    revalidatePath('/sales');
    revalidatePath('/work-orders');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function deleteCustomer(formData: FormData) {
    const user = await requireWorkshop();
    const supabase = await createClient();
    const id = formData.get('id') as string;

    const { count } = await supabase
        .from('motorcycles')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id)
        .eq('organization_id', user.workshopId);

    if (count && count > 0) {
        return { message: 'No se puede eliminar: Tiene motocicletas asociadas' };
    }

    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('organization_id', user.workshopId);

    if (error) {
        console.error('❌ [deleteCustomer] Error eliminando cliente:', error);
        return { message: 'Error al eliminar: ' + error.message };
    }

    revalidatePath('/customers');
    revalidatePath('/customers', 'page');
    revalidatePath('/motorcycles');
    revalidatePath('/sales');
    revalidatePath('/work-orders');
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function getCustomerByCedula(cedula: string) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const { data } = await supabase
        .from('customers')
        .select(`
            id, first_name, last_name, email, phone, document_number,
            motorcycles (
                id, brand, model, model_year, license_plate, vin, engine_displacement_cc, color, current_mileage, engine_number, chassis_number, created_at
            )
        `)
        .eq('document_number', cedula)
        .eq('organization_id', user.workshopId)
        .maybeSingle();

    if (!data) return null;

    // Obtener la moto más reciente si tiene
    let latestMotorcycle = null;
    if (data.motorcycles && data.motorcycles.length > 0) {
        // Ordenar por created_at desc (más reciente primero)
        const sorted = data.motorcycles.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        latestMotorcycle = sorted[0];
    }

    // Mapeo al frontend
    return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone,
        cedula: data.document_number,
        motorcycle: latestMotorcycle ? {
            id: latestMotorcycle.id,
            brand: latestMotorcycle.brand,
            model: latestMotorcycle.model,
            model_year: latestMotorcycle.model_year,
            license_plate: latestMotorcycle.license_plate,
            vin: latestMotorcycle.vin,
            engine_displacement_cc: latestMotorcycle.engine_displacement_cc,
            color: latestMotorcycle.color,
            current_mileage: latestMotorcycle.current_mileage,
            engine_number: latestMotorcycle.engine_number,
            chassis_number: latestMotorcycle.chassis_number
        } : null
    };
}

export async function getCustomerByName(name: string) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Remove extra spaces and split to try matching first_name and last_name
    const parts = name.trim().split(/\s+/);
    const searchFirst = parts[0];
    const searchLast = parts.length > 1 ? parts.slice(1).join(' ') : '';

    let query = supabase
        .from('customers')
        .select(`
            id, first_name, last_name, email, phone, document_number,
            motorcycles (
                id, brand, model, model_year, license_plate, vin, engine_displacement_cc, color, current_mileage, engine_number, chassis_number, created_at
            )
        `)
        .eq('organization_id', user.workshopId);

    if (searchLast) {
        query = query.ilike('first_name', `%${searchFirst}%`).ilike('last_name', `%${searchLast}%`);
    } else {
        query = query.or(`first_name.ilike.%${searchFirst}%,last_name.ilike.%${searchFirst}%`);
    }

    const { data } = await query.limit(1).maybeSingle();

    if (!data) return null;

    let latestMotorcycle = null;
    if (data.motorcycles && data.motorcycles.length > 0) {
        const sorted = data.motorcycles.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        latestMotorcycle = sorted[0];
    }

    return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone,
        cedula: data.document_number,
        motorcycle: latestMotorcycle ? {
            id: latestMotorcycle.id,
            brand: latestMotorcycle.brand,
            model: latestMotorcycle.model,
            model_year: latestMotorcycle.model_year,
            license_plate: latestMotorcycle.license_plate,
            vin: latestMotorcycle.vin,
            engine_displacement_cc: latestMotorcycle.engine_displacement_cc,
            color: latestMotorcycle.color,
            current_mileage: latestMotorcycle.current_mileage,
            engine_number: latestMotorcycle.engine_number,
            chassis_number: latestMotorcycle.chassis_number
        } : null
    };
}

export async function getCustomerFullHistory(id: string) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    const { data: customer } = await supabase
        .from('customers')
        .select(`
            id, first_name, last_name, email, phone, document_number, created_at,
            motorcycles (
                id, brand, model, model_year, license_plate, current_mileage, created_at,
                work_orders (
                    id, order_number, status, created_at, reported_symptoms
                )
            ),
            sales (
                id, sale_number, total, created_at, status, payment_method,
                sale_items ( id, quantity, unit_price, inventory_items(name) )
            )
        `)
        .eq('id', id)
        .eq('organization_id', user.workshopId)
        .single();

    if (!customer) return null;

    const motorcycles = (customer.motorcycles || []).map((m: any) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        year: m.model_year,
        plate: m.license_plate,
        mileage: m.current_mileage,
        createdAt: m.created_at
    }));

    const workOrders: any[] = [];
    (customer.motorcycles || []).forEach((m: any) => {
        if (m.work_orders && m.work_orders.length > 0) {
            m.work_orders.forEach((wo: any) => {
                workOrders.push({
                    id: wo.id,
                    orderNumber: `WO-${wo.order_number}`,
                    status: wo.status,
                    createdAt: wo.created_at,
                    issue: wo.reported_symptoms,
                    motorcycle: `${m.brand} ${m.model} (${m.license_plate})`
                });
            });
        }
    });

    const sales = (customer.sales || []).map((s: any) => ({
        id: s.id,
        saleNumber: `SALE-${s.sale_number || s.id.substring(0, 6)}`,
        total: s.total,
        createdAt: s.created_at,
        status: s.status,
        paymentMethod: s.payment_method,
        itemsCount: s.sale_items?.length || 0
    }));

    workOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`.trim(),
        email: customer.email,
        phone: customer.phone,
        cedula: customer.document_number,
        createdAt: customer.created_at,
        motorcycles,
        workOrders,
        sales,
        summary: {
            totalMotorcycles: motorcycles.length,
            totalWorkOrders: workOrders.length,
            totalSales: sales.length,
            totalSpent: sales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0)
        }
    };
}

export async function importCustomers(records: any[]) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
            // 1. Find or create customer
            let customerId = null;
            const { firstName, lastName } = splitName(record.customerName || 'Sin Nombre');
            
            if (record.customerCedula) {
                const { data } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('organization_id', user.workshopId)
                    .eq('document_number', record.customerCedula)
                    .maybeSingle();
                if (data) customerId = data.id;
            }

            if (!customerId && record.customerEmail) {
                const { data } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('organization_id', user.workshopId)
                    .eq('email', record.customerEmail)
                    .maybeSingle();
                if (data) customerId = data.id;
            }

            if (customerId) {
                // Update customer
                await supabase.from('customers').update({
                    first_name: firstName,
                    last_name: lastName,
                    ...(record.customerEmail ? { email: record.customerEmail } : {}),
                    ...(record.customerPhone ? { phone: record.customerPhone } : {}),
                    ...(record.customerCedula ? { document_number: record.customerCedula } : {})
                }).eq('id', customerId);
            } else {
                // Create customer
                const { data: newCustomer, error: createCustError } = await supabase
                    .from('customers')
                    .insert({
                        organization_id: user.workshopId,
                        first_name: firstName,
                        last_name: lastName,
                        email: record.customerEmail || null,
                        document_number: record.customerCedula || null,
                        phone: record.customerPhone || null,
                        created_by: user.userId || null
                    })
                    .select('id')
                    .single();
                
                if (createCustError) throw new Error(`Error creando cliente: ${createCustError.message}`);
                customerId = newCustomer.id;
            }

            // 2. Find or create motorcycle
            if (!record.motoPlate) {
                throw new Error("La placa de la moto es obligatoria.");
            }

            const { data: existingMoto } = await supabase
                .from('motorcycles')
                .select('id')
                .eq('organization_id', user.workshopId)
                .ilike('license_plate', record.motoPlate.trim())
                .maybeSingle();

            if (existingMoto) {
                // Update moto
                const { error: updateMotoError } = await supabase
                    .from('motorcycles')
                    .update({
                        customer_id: customerId,
                        brand: record.motoBrand || 'Desconocida',
                        model: record.motoModel || 'Desconocido',
                        model_year: record.motoYear || new Date().getFullYear(),
                    })
                    .eq('id', existingMoto.id);
                if (updateMotoError) throw new Error(`Error actualizando moto: ${updateMotoError.message}`);
            } else {
                // Create moto
                const { error: createMotoError } = await supabase
                    .from('motorcycles')
                    .insert({
                        organization_id: user.workshopId,
                        customer_id: customerId,
                        brand: record.motoBrand || 'Desconocida',
                        model: record.motoModel || 'Desconocido',
                        model_year: record.motoYear || new Date().getFullYear(),
                        license_plate: record.motoPlate.trim(),
                    });
                if (createMotoError) throw new Error(`Error creando moto: ${createMotoError.message}`);
            }

            successCount++;
        } catch (err: any) {
            console.error(`Error importando registro de ${record.customerName}:`, err);
            errorCount++;
            errors.push(`Fila ${i + 2} (${record.customerName}): ${err.message}`);
        }
    }

    revalidatePath('/customers');
    revalidatePath('/customers', 'page');
    revalidatePath('/motorcycles');
    return { success: true, successCount, errorCount, errors };
}

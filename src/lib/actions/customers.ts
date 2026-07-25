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
        .select('id, first_name, last_name, email, phone, document_number')
        .eq('document_number', cedula)
        .eq('organization_id', user.workshopId)
        .maybeSingle();

    if (!data) return null;

    // Mapeo al frontend
    return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone,
        cedula: data.document_number
    };
}

export async function getCustomerByName(name: string) {
    const user = await requireWorkshop();
    const supabase = await createClient();

    // Remove extra spaces and split to try matching first_name and last_name
    const parts = name.trim().split(' ');
    const searchFirst = parts[0];
    const searchLast = parts.length > 1 ? parts.slice(1).join(' ') : searchFirst;

    const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, document_number')
        .eq('organization_id', user.workshopId)
        .or(`first_name.ilike.%${searchFirst}%,last_name.ilike.%${searchLast}%`)
        .limit(1)
        .maybeSingle();

    if (!data) return null;

    return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone,
        cedula: data.document_number
    };
}

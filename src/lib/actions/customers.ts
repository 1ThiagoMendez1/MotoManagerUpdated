'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'

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
})

export async function createCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    // Use admin client to bypass RLS on all operations in this action
    const supabaseAdmin = await createAdminClient()

    const validatedFields = customerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        cedula: formData.get('cedula'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { name, email, phone, cedula } = validatedFields.data

    if (cedula) {
        const { data: existingCedula, error: cedulaError } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', cedula)
            .maybeSingle()
        if (cedulaError) {
            console.error('❌ [createCustomer] Error verificando cédula:', cedulaError)
            return { message: 'Error al verificar la cédula: ' + cedulaError.message }
        }
        if (existingCedula) return { message: 'Ya existe un cliente con esta cédula.' }
    }

    if (email) {
        const { data: existingEmail, error: emailError } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('email', email)
            .maybeSingle()
        if (emailError) {
            console.error('❌ [createCustomer] Error verificando email:', emailError)
            return { message: 'Error al verificar el correo electrónico: ' + emailError.message }
        }
        if (existingEmail) return { message: 'Ya existe un cliente con este correo electrónico.' }
    }

    const { error } = await supabaseAdmin
        .from('clientes')
        .insert({
            workshop_id: user.workshopId,
            name,
            email: email || null,
            phone: phone || null,
            cedula: cedula || null,
        })

    if (error) {
        console.error('❌ [createCustomer] Error insertando cliente:', error)
        return { message: 'Error al crear el cliente: ' + error.message }
    }

    revalidatePath('/customers')
    revalidatePath('/customers', 'page')
    revalidatePath('/motorcycles')
    revalidatePath('/sales')
    revalidatePath('/work-orders')
    revalidatePath('/', 'layout')
    return { success: true }
}


export async function updateCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabaseAdmin = await createAdminClient()

    const id = formData.get('id') as string

    if (!id) return { message: 'ID requerido' }

    const validatedFields = customerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        cedula: formData.get('cedula'),
    })

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { name, email, phone, cedula } = validatedFields.data

    if (cedula) {
        const { data: existingCedula, error: cedulaError } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', cedula)
            .neq('id', id)
            .maybeSingle()
        if (cedulaError) {
            console.error('❌ [updateCustomer] Error verificando cédula:', cedulaError)
            return { message: 'Error al verificar la cédula: ' + cedulaError.message }
        }
        if (existingCedula) return { message: 'Ya existe otro cliente con esta cédula.' }
    }

    if (email) {
        const { data: existingEmail, error: emailError } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('email', email)
            .neq('id', id)
            .maybeSingle()
        if (emailError) {
            console.error('❌ [updateCustomer] Error verificando email:', emailError)
            return { message: 'Error al verificar el correo electrónico: ' + emailError.message }
        }
        if (existingEmail) return { message: 'Ya existe otro cliente con este correo electrónico.' }
    }

    const { error } = await supabaseAdmin
        .from('clientes')
        .update({
            name,
            email: email || null,
            phone: phone || null,
            cedula: cedula || null
        })
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        console.error('❌ [updateCustomer] Error actualizando cliente:', error)
        return { message: 'Error al actualizar: ' + error.message }
    }

    revalidatePath('/customers')
    revalidatePath('/customers', 'page')
    revalidatePath('/motorcycles')
    revalidatePath('/sales')
    revalidatePath('/work-orders')
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function deleteCustomer(formData: FormData) {
    const user = await requireWorkshop()
    const supabaseAdmin = await createAdminClient()
    const id = formData.get('id') as string

    const { count } = await supabaseAdmin
        .from('motorcycles')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id)
        .eq('workshop_id', user.workshopId)

    if (count && count > 0) {
        return { message: 'No se puede eliminar: Tiene motocicletas asociadas' }
    }

    const { error } = await supabaseAdmin
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        console.error('❌ [deleteCustomer] Error eliminando cliente:', error)
        return { message: 'Error al eliminar: ' + error.message }
    }

    revalidatePath('/customers')
    revalidatePath('/customers', 'page')
    revalidatePath('/motorcycles')
    revalidatePath('/sales')
    revalidatePath('/work-orders')
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function getCustomerByCedula(cedula: string) {
    const user = await requireWorkshop()
    const supabaseAdmin = await createAdminClient()

    const { data } = await supabaseAdmin
        .from('clientes')
        .select('id, name, email, phone, cedula')
        .eq('cedula', cedula)
        .eq('workshop_id', user.workshopId)
        .maybeSingle()

    return data
}

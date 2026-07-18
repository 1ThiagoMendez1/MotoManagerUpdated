'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'

const customerSchema = z.object({
    name: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("El email debe ser válido.").transform(val => val.toLowerCase()),
    phone: z.string().optional(),
    cedula: z.string().optional().transform(val => val === '' ? undefined : val),
})

export async function createCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

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
        const { data: existingCedula } = await supabase
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', cedula)
            .maybeSingle()
        if (existingCedula) return { message: 'Ya existe un cliente con esta cédula.' }
    }

    if (email) {
        const { data: existingEmail } = await supabase
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('email', email)
            .maybeSingle()
        if (existingEmail) return { message: 'Ya existe un cliente con este correo electrónico.' }
    }

    const { error } = await supabase
        .from('clientes')
        .insert({
            workshop_id: user.workshopId,
            name,
            email,
            phone,
            cedula,
        })

    if (error) {
        console.error('Error creating customer:', error)
        return { message: 'Error al crear el cliente.' }
    }

    revalidatePath('/customers') // Assuming the page is /customers
    return { success: true }
}

export async function updateCustomer(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

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
        const { data: existingCedula } = await supabase
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', cedula)
            .neq('id', id)
            .maybeSingle()
        if (existingCedula) return { message: 'Ya existe otro cliente con esta cédula.' }
    }

    if (email) {
        const { data: existingEmail } = await supabase
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('email', email)
            .neq('id', id)
            .maybeSingle()
        if (existingEmail) return { message: 'Ya existe otro cliente con este correo electrónico.' }
    }

    const { error } = await supabase
        .from('clientes')
        .update({ name, email, phone, cedula })
        .eq('id', id)
        .eq('workshop_id', user.workshopId) // Security check

    if (error) {
        console.error('Error updating customer:', error)
        return { message: 'Error al actualizar' }
    }

    revalidatePath('/customers')
    return { success: true }
}

export async function deleteCustomer(formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()
    const id = formData.get('id') as string

    // Check dependencies (Motorcycles, Sales)
    // We can rely on Foreign Key constraints if set to RESTRICT, or check manually.
    // Given SQL constraints:
    // Motorcycles: ON DELETE CASCADE (Wait, my SQL schema said CASCADE for customer->motorcycle?)
    // Let's check supa-schema.sql:
    // customer_id uuid references public.customers(id) on delete cascade
    // So deleting customer DELETES motorcycles? 
    // Prisma logic prevented deletion if they had motorcycles.
    // Supabase/SQL schema I defined says CASCADE.
    // If we want to prevent it, we should check manually.

    const { count } = await supabase
        .from('motorcycles')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id)
        .eq('workshop_id', user.workshopId)

    if (count && count > 0) {
        return { message: 'No se puede eliminar: Tiene motocicletas asociadas' }
    }

    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('workshop_id', user.workshopId)

    if (error) {
        return { message: 'Error al eliminar' }
    }

    revalidatePath('/customers')
    return { success: true }
}

export async function getCustomerByCedula(cedula: string) {
    const user = await requireWorkshop() // ensure auth
    const supabase = await createClient()

    const { data } = await supabase
        .from('clientes')
        .select('id, name, email, phone, cedula')
        .eq('cedula', cedula)
        .eq('workshop_id', user.workshopId)
        .single()

    return data
}

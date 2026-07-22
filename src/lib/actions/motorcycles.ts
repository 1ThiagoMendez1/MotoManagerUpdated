'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'

const motorcycleSchema = z.object({
    make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
    model: z.string().min(1, "El modelo es requerido."),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    plate: z.string().min(1, "La placa es requerida."),
    customerCedula: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
        z.string().optional()
    ),
    customerName: z.string().min(1, "El nombre del cliente es requerido."),
    customerEmail: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim().toLowerCase()),
        z.string().email("Email válido requerido.").optional()
    ),
    customerPhone: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
        z.string().optional()
    ),
    issueDescription: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
})

export async function createMotorcycle(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabaseAdmin = await createAdminClient()

    const formDataObj = {
        make: formData.get('make'),
        model: formData.get('model'),
        year: formData.get('year'),
        plate: formData.get('plate'),
        customerEmail: formData.get('customerEmail'),
        customerName: formData.get('customerName'),
        customerPhone: formData.get('customerPhone'),
        customerCedula: formData.get('customerCedula'),
        issueDescription: formData.get('issueDescription'),
    }

    const validatedFields = motorcycleSchema.safeParse(formDataObj)

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors }
    }

    const { make, model, year, plate, customerEmail, customerName, customerPhone, customerCedula, issueDescription } = validatedFields.data

    const { data: existingPlate } = await supabaseAdmin
        .from('motorcycles')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('plate', plate)
        .maybeSingle()
    if (existingPlate) return { message: 'Ya existe una motocicleta con esta placa en el taller.' }

    // 1. Find or Create Customer
    let customer: { id: string } | null = null;

    if (customerCedula) {
        const { data: customerByCedula } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', customerCedula)
            .maybeSingle()
        if (customerByCedula) customer = customerByCedula;
    }

    if (!customer && customerEmail) {
        const { data: customerByEmail } = await supabaseAdmin
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('email', customerEmail)
            .maybeSingle()
        if (customerByEmail) customer = customerByEmail;
    }

    if (customer) {
        // Update existing customer info
        await supabaseAdmin.from('clientes').update({
            name: customerName,
            ...(customerEmail ? { email: customerEmail } : {}),
            ...(customerPhone ? { phone: customerPhone } : {}),
            ...(customerCedula ? { cedula: customerCedula } : {}),
        }).eq('id', customer.id)
    } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabaseAdmin
            .from('clientes')
            .insert({
                workshop_id: user.workshopId,
                name: customerName,
                email: customerEmail || null,
                cedula: customerCedula || null,
                phone: customerPhone || null
            })
            .select('id')
            .single()

        if (createError) {
            console.error("Error creating customer for motorcycle:", createError)
            return { message: "Error al crear cliente: " + createError.message }
        }
        customer = newCustomer
    }

    if (!customer) return { message: 'No se pudo asignar el cliente' }

    // 2. Create Motorcycle
    const { error: motoError } = await supabaseAdmin
        .from('motorcycles')
        .insert({
            workshop_id: user.workshopId,
            customer_id: customer.id,
            make,
            model,
            year,
            plate,
            notes: issueDescription
        })

    if (motoError) {
        console.error('Error creating motorcycle:', motoError)
        return { message: 'Error al crear motocicleta: ' + motoError.message }
    }

    revalidatePath('/motorcycles')
    revalidatePath('/customers')
    revalidatePath('/sales')
    revalidatePath('/work-orders')
    revalidatePath('/', 'layout')
    return { success: true }
}

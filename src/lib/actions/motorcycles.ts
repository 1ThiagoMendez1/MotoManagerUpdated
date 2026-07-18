'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireWorkshop } from '@/lib/auth-server'

const motorcycleSchema = z.object({
    make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
    model: z.string().min(1, "El modelo es requerido."),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    plate: z.string().min(1, "La placa es requerida."),
    customerCedula: z.string().min(1, "La cédula es requerida."),
    customerName: z.string().min(1, "El nombre del cliente es requerido."),
    customerEmail: z.string().email("Email válido requerido.").transform(val => val.toLowerCase()),
    customerPhone: z.string().optional(),
    issueDescription: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
})

export async function createMotorcycle(prevState: any, formData: FormData) {
    const user = await requireWorkshop()
    const supabase = await createClient()

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

    const { data: existingPlate } = await supabase
        .from('motorcycles')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('plate', plate)
        .maybeSingle()
    if (existingPlate) return { message: 'Ya existe una motocicleta con esta placa en el taller.' }

    // 1. Find or Create Customer (Upsert logic)
    // Supabase upsert requires a unique constraint match.
    // My schema has `unique(workshop_id, email)` and `unique(workshop_id, cedula)`.
    // If I upsert by Email, I need to know the workshop_id.

    // Let's try to find by Email first.
    let { data: customer } = await supabase
        .from('clientes')
        .select('id')
        .eq('workshop_id', user.workshopId)
        .eq('email', customerEmail)
        .single()

    if (!customer) {
        // If not by email, try by Cedula?
        const { data: customerByCedula } = await supabase
            .from('clientes')
            .select('id')
            .eq('workshop_id', user.workshopId)
            .eq('cedula', customerCedula)
            .single()

        if (customerByCedula) {
            customer = customerByCedula // Found by cedula
            // Update info?
            await supabase.from('clientes').update({
                name: customerName,
                email: customerEmail,
                phone: customerPhone
            }).eq('id', customer.id)
        } else {
            // Create new
            const { data: newCustomer, error: createError } = await supabase
                .from('clientes')
                .insert({
                    workshop_id: user.workshopId,
                    name: customerName,
                    email: customerEmail,
                    cedula: customerCedula,
                    phone: customerPhone
                })
                .select('id')
                .single()

            if (createError) {
                console.error("Error creating customer for motorcycle:", createError)
                return { message: "Error al crear cliente: " + createError.message }
            }
            customer = newCustomer
        }
    } else {
        // Update existing
        await supabase.from('clientes').update({
            name: customerName,
            cedula: customerCedula,
            phone: customerPhone
        }).eq('id', customer.id)
    }

    if (!customer) return { message: 'No se pudo asignar el cliente' }

    // 2. Create Motorcycle
    const { error: motoError } = await supabase
        .from('motorcycles')
        .insert({
            workshop_id: user.workshopId,
            customer_id: customer.id,
            make,
            model,
            year,
            plate,
            // issueDescription is not in my motorcycles table in SQL schema? 
            // Let me store it in `notes` or if I added `issue_description`?
            // Re-reading schema... I did NOT add issue_description to Motorcycle directly in SQL?
            // Let me check SQL again.
            // SQL: `notes text`.
            // Prisma: `issueDescription String?`
            // I should map issueDescription to notes or add the column.
            // I'll map to `notes` for now.
            notes: issueDescription
        })

    if (motoError) {
        console.error('Error creating motorcycle:', motoError)
        return { message: 'Error al crear motocicleta: ' + motoError.message }
    }

    revalidatePath('/motorcycles')
    return { success: true }
}

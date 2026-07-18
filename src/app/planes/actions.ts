'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendCredentialsNotification } from '@/lib/whatsapp'

const registrationSchema = z.object({
    workshopName: z.string().min(3, 'El nombre del taller debe tener al menos 3 caracteres'),
    slug: z.string()
        .min(3, 'El identificador debe tener al menos 3 caracteres')
        .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email('Correo electrónico inválido'),
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    phone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
    workshopPhone: z.string().optional(),
    address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
    mapsLink: z.string().url('Debe ser un link válido').optional().or(z.literal('')),
    city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
    nit: z.string().min(5, 'El NIT debe tener al menos 5 caracteres'),
    subscriptionPlan: z.enum(['monthly', 'biannual', 'yearly']),
    paymentRef: z.string().optional(),
})

export async function registerWorkshopPublic(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData)

    // Auto-sanitize slug
    if (typeof data.slug === 'string') {
        data.slug = data.slug
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
    }

    const validation = registrationSchema.safeParse(data)
    if (!validation.success) {
        return {
            error: 'Datos inválidos. Revisa los campos marcados.',
            details: validation.error.flatten().fieldErrors,
            fields: data
        }
    }

    const { workshopName, slug, email, fullName, phone, workshopPhone, address, mapsLink, city, nit, subscriptionPlan } = validation.data
    
    // Generate automatic password
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { 
            full_name: fullName, 
            phone,
            temp_password: generatedPassword // Store it temporarily to show it to the admin
        },
    })

    if (authError) {
        const msg = authError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists')) {
            return { error: 'Ya existe una cuenta con ese correo electrónico.', fields: data }
        }
        return { error: 'Error al crear la cuenta: ' + authError.message, fields: data }
    }

    if (!authData.user) {
        return { error: 'No se pudo crear el usuario.', fields: data }
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    if (subscriptionPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscriptionPlan === 'biannual') {
        endDate.setMonth(endDate.getMonth() + 6);
    } else if (subscriptionPlan === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create workshop
    const { data: workshop, error: workshopError } = await supabaseAdmin
        .from('workshops')
        .insert({
            name: workshopName,
            slug,
            phone: workshopPhone || phone,
            address,
            maps_link: mapsLink || null,
            city,
            nit,
            subscription_status: 'active',
            subscription_plan: subscriptionPlan,
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString(),
            next_billing_date: endDate.toISOString(),
        })
        .select()
        .single()

    if (workshopError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
        if (workshopError.code === '23505') {
            return { error: 'Ese identificador de taller ya está en uso. Elige otro.', fields: data }
        }
        return { error: 'Error al crear el taller: ' + workshopError.message, fields: data }
    }

    // Assign owner
    const { error: memberError } = await supabaseAdmin
        .from('workshop_members')
        .insert({
            user_id: authData.user.id,
            workshop_id: workshop.id,
            role: 'owner',
        })

    if (memberError) {
        return { error: 'Error al configurar el taller: ' + memberError.message, fields: data }
    }

    // Try to send WhatsApp notification with credentials
    if (phone) {
        // Not await-ing this to avoid blocking the registration process if WA API is slow
        sendCredentialsNotification(
            phone,
            fullName,
            workshopName,
            slug,
            email,
            generatedPassword
        ).catch(e => console.error('Failed to send WhatsApp credentials:', e));
    }

    // Sign user in automatically
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: generatedPassword })

    if (signInError) {
        redirect('/login?registered=true')
    }

    redirect('/?firstLogin=true')
}

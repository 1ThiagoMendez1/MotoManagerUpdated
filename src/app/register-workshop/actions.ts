'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendCredentialsNotification } from '@/lib/whatsapp'

const registrationSchema = z.object({
    workshopName: z.string().min(3),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email(),
    // password: z.string().min(6),
    fullName: z.string().min(2),
    phone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
    subscriptionPlan: z.enum(['monthly', 'biannual', 'yearly', 'demo']),
    demoDays: z.string().optional(),
})

export async function registerWorkshop(prevState: any, formData: FormData) {
    // 1. Validate Input
    const data = Object.fromEntries(formData)

    // Auto-sanitize slug: lowercase, trim, replace spaces with -
    if (typeof data.slug === 'string') {
        data.slug = data
            .slug
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w-]+/g, '')  // Remove non-word chars (except -)
            .replace(/--+/g, '-')     // Replace multiple - with single -
    }

    const validation = registrationSchema.safeParse(data)

    if (!validation.success) {
        return { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors }
    }

    const { workshopName, slug, email, fullName, phone, subscriptionPlan, demoDays } = validation.data

    let actualPlan = subscriptionPlan as string;
    let actualStatus = 'active';
    let endDate = null;

    if (subscriptionPlan === 'demo') {
        actualPlan = 'monthly';
        actualStatus = 'trialing';
        if (demoDays) {
            const days = parseInt(demoDays, 10);
            if (!isNaN(days) && days > 0) {
                const date = new Date();
                date.setDate(date.getDate() + days);
                endDate = date.toISOString();
            }
        }
    }

    // Generate automatic password
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    // 2. Define Service Role Client (for Admin operations)
    // This bypasses RLS and allows us to create users and records without session limitations
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // 3. Create User (Admin API - Bypasses email confirmation if needed)
    console.log('Creating user with Admin API...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true, // Auto-confirm for immediate access
        user_metadata: {
            full_name: fullName,
            phone: phone,
            temp_password: generatedPassword
        }
    })

    if (authError) {
        console.error('Auth Error:', authError);
        return { error: 'Error creando usuario: ' + authError.message }
    }

    if (!authData.user) {
        return { error: 'No se pudo crear el usuario.' }
    }

    console.log('User created:', authData.user.id);

    // 4. Create Workshop MANUAL INSERT (Avoids RPC complexity/bugs)
    console.log('Creating Workshop manually...');

    // A. Insert Workshop
    const { data: workshop, error: workshopError } = await supabaseAdmin
        .from('workshops')
        .insert({
            name: workshopName,
            slug: slug,
            subscription_status: actualStatus,
            subscription_plan: actualPlan,
            ...(endDate ? { subscription_end_date: endDate } : {})
        })
        .select()
        .single();

    if (workshopError) {
        console.error('Workshop Creation Error:', workshopError);
        // Clean up user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: 'Error al crear el taller: ' + workshopError.message }
    }

    // B. Assign Owner
    const { error: memberError } = await supabaseAdmin
        .from('workshop_members')
        .insert({
            user_id: authData.user.id,
            workshop_id: workshop.id,
            role: 'owner'
        });

    if (memberError) {
        console.error('Member Assignment Error:', memberError);
        // Clean up potentially
        return { error: 'Error al asignar dueño: ' + memberError.message }
    }

    if (phone) {
        sendCredentialsNotification(
            phone,
            fullName,
            workshopName,
            slug,
            email,
            generatedPassword
        ).catch(e => console.error('Failed to send WhatsApp credentials:', e));
    }

    console.log('Workshop created successfully via Admin Direct Insert:', workshop.id);
    redirect('/?firstLogin=true')
}

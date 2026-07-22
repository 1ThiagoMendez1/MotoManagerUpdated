'use server';

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { sendCredentialsNotification } from '@/lib/whatsapp'

const registrationSchema = z.object({
    workshopName: z.string().min(3),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email(),
    fullName: z.string().min(2),
    phone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
    subscriptionPlan: z.enum(['monthly', 'biannual', 'yearly', 'demo']),
    demoDays: z.string().optional(),
})

export async function registerWorkshop(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData)

    if (typeof data.slug === 'string') {
        data.slug = data
            .slug
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
    }

    const validation = registrationSchema.safeParse(data)

    if (!validation.success) {
        return { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors }
    }

    const { workshopName, slug, email, fullName, phone, subscriptionPlan, demoDays } = validation.data

    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

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

    console.log('Creating user with Admin API...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
            first_name: fullName.split(' ')[0],
            last_name: fullName.split(' ').slice(1).join(' ') || '',
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

    console.log('Signing in the new user to create organization...');
    // Iniciar sesión con el nuevo usuario para obtener el contexto de RLS y auth.uid()
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: generatedPassword
    });

    if (signInError) {
        console.error('Sign In Error:', signInError);
        return { error: 'Error al iniciar sesión tras el registro: ' + signInError.message };
    }

    console.log('Calling create_organization_with_owner RPC...');
    
    // Llamar al RPC usando la sesión del usuario recién creado
    const { data: orgId, error: rpcError } = await supabase.rpc('create_organization_with_owner', {
        org_name: workshopName,
        org_slug: slug
    });

    if (rpcError) {
        console.error('RPC Error creating organization:', rpcError);
        // Fallback: cleanup is hard here because they are logged in, but we can try
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabase.auth.signOut();
        return { error: 'Error al crear el taller: ' + rpcError.message };
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

    console.log('Workshop created successfully:', orgId);
    redirect('/dashboard?firstLogin=true');
}

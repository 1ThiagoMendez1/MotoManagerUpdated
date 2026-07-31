'use server';

import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { sendOwnerWelcomeNotification } from '@/lib/whatsapp'

const registrationSchema = z.object({
    workshopName: z.string().min(3),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    email: z.string().email(),
    fullName: z.string().min(2),
    phone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
    subscriptionPlan: z.enum(['monthly', 'biannual', 'yearly', 'demo']),
    demoStartDate: z.string().optional(),
    demoEndDate: z.string().optional(),
    legalName: z.string().optional(),
    taxIdentifier: z.string().optional(),
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

    const { workshopName, slug, email, fullName, phone, subscriptionPlan, demoStartDate, demoEndDate, legalName, taxIdentifier } = validation.data

    const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

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
            temp_password: generatedPassword,
            needs_password_change: true
        }
    })

    if (authError) {
        console.error('Auth Error:', authError);
        return { error: 'Error creando usuario: ' + authError.message }
    }

    if (!authData.user) {
        return { error: 'No se pudo crear el usuario.' }
    }

    console.log('Signing in the new user in a memory client to create organization...');
    
    // Creamos un cliente en memoria que NO usa cookies, para no sobreescribir la sesión del admin
    const tempClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    );

    const { error: signInError } = await tempClient.auth.signInWithPassword({
        email,
        password: generatedPassword
    });

    if (signInError) {
        console.error('Sign In Error:', signInError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: 'Error de autenticación temporal: ' + signInError.message };
    }

    console.log('Calling create_organization_with_owner RPC...');
    
    // Llamar al RPC usando la sesión en memoria
    const { data: orgId, error: rpcError } = await tempClient.rpc('create_organization_with_owner', {
        org_name: workshopName,
        org_slug: slug,
        org_email: email,
        org_phone: phone,
        org_legal_name: legalName || null,
        org_tax_identifier: taxIdentifier || null,
        sub_plan: subscriptionPlan,
        demo_start: demoStartDate || null,
        demo_end: demoEndDate || null
    });

    if (rpcError) {
        console.error('RPC Error creating organization:', rpcError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: 'Error al crear el taller en la base de datos: ' + rpcError.message };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    console.log('\n=============================================');
    console.log('📱 SIMULACIÓN DE ENVÍO DE WHATSAPP (API DE META)');
    console.log('=============================================');
    console.log(`Destinatario: ${phone}`);
    console.log(`Mensaje:`);
    console.log(`¡Hola ${fullName}! 🎉`);
    console.log(`Tu registro para el taller *${workshopName}* ha sido exitoso.`);
    console.log(`Hemos preparado todo para que comiences a gestionar tu negocio de inmediato.`);
    console.log(`\n📋 *Tus Datos Importantes:*`);
    console.log(`- Taller: ${workshopName}`);
    console.log(`- Usuario (Email): ${email}`);
    console.log(`\n🔑 *Código de Acceso Temporal:*`);
    console.log(`Para ingresar, visita la página de login e ingresa con tu correo y este código de 6 dígitos:`);
    console.log(`👉 *${generatedPassword}* 👈`);
    console.log(`🔗 Ingresa aquí: ${loginUrl}`);
    console.log(`(Por seguridad, el sistema te pedirá cambiar tu contraseña al ingresar).`);
    console.log('=============================================\n');

    if (phone) {
        const startDate = new Date();
        const endDate = new Date(startDate);

        if (subscriptionPlan === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (subscriptionPlan === 'biannual') {
            endDate.setMonth(endDate.getMonth() + 6);
        } else if (subscriptionPlan === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (subscriptionPlan === 'demo') {
            if (demoEndDate) {
                const parsedEnd = new Date(demoEndDate);
                if (!isNaN(parsedEnd.getTime())) {
                    endDate.setTime(parsedEnd.getTime());
                } else {
                    endDate.setDate(endDate.getDate() + 7);
                }
            } else {
                endDate.setDate(endDate.getDate() + 7);
            }
            
            if (demoStartDate) {
                const parsedStart = new Date(demoStartDate);
                if (!isNaN(parsedStart.getTime())) {
                    startDate.setTime(parsedStart.getTime());
                }
            }
        }

        await sendOwnerWelcomeNotification(
            phone,
            fullName,
            workshopName,
            subscriptionPlan,
            startDate,
            endDate,
            generatedPassword
        ).catch(e => console.error('Failed to send WhatsApp owner welcome template:', e));
    }

    console.log('Workshop created successfully:', orgId);
    return {
        success: true,
        data: {
            workshopName,
            slug,
            email,
            phone,
            fullName,
            legalName,
            taxIdentifier,
            subscriptionPlan,
            demoStartDate,
            demoEndDate
        }
    };
}

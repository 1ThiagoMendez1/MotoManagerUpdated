'use server';

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { sendOwnerWelcomeNotification } from '@/lib/whatsapp'
import { catalogSubscriptionPrice, verifySubscriptionPayment } from '@/lib/payments/subscription-payment'
import { randomInt } from 'node:crypto'

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
    subscriptionPlan: z.enum(['basic', 'pro', 'full']),
    billingCycle: z.enum(['monthly', 'biannual', 'yearly']),
    paymentRef: z.string().optional(),
})

export async function registerWorkshopPublic(prevState: any, formData: FormData) {
    const data = Object.fromEntries(formData)
    console.log('\n🚀 ===== INICIO REGISTRO TALLER =====')


    // Auto-sanitize slug
    if (typeof data.slug === 'string') {
        data.slug = data.slug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    const validation = registrationSchema.safeParse(data)

    if (!validation.success) {
        console.error('❌ Error de validación:', validation.error.flatten().fieldErrors)
        return { error: 'Por favor revisa los campos del formulario.', fields: data }
    }
    console.log('✅ Validación OK')

    const { workshopName, slug, email, fullName, phone, workshopPhone, address, mapsLink, city, nit, subscriptionPlan, billingCycle } = validation.data
    
    let verifiedPayment;
    try {
        verifiedPayment = await verifySubscriptionPayment({
            transactionId: String(data.paymentRef || ''), email,
            referencePrefix: `MM-NEW-${subscriptionPlan.toUpperCase()}-`,
            amount: await catalogSubscriptionPrice(subscriptionPlan, billingCycle),
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'No se pudo verificar el pago.', fields: data };
    }

    // Generate automatic password
    const generatedPassword = randomInt(100000, 1000000).toString(); // 6-digit OTP


    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    console.log('👤 Creando usuario auth para:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { 
            first_name: fullName.split(' ')[0],
            last_name: fullName.split(' ').slice(1).join(' ') || '',
            phone,
            temp_password: generatedPassword,
            needs_password_change: true
        },
    })

    if (authError) {
        console.error('❌ Error creando auth user:', authError.message, authError)
        const msg = authError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists')) {
            return { error: 'Ya existe una cuenta con ese correo electrónico.', fields: data }
        }
        return { error: 'Error al crear la cuenta: ' + authError.message, fields: data }
    }

    if (!authData.user) {
        console.error('❌ authData.user es null después de crear usuario')
        return { error: 'No se pudo crear el usuario.', fields: data }
    }
    console.log('✅ Usuario auth creado. ID:', authData.user.id)

    // Calculate subscription dates based on billingCycle
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === 'biannual') {
        endDate.setMonth(endDate.getMonth() + 6);
    } else if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }
    console.log('📅 Plan:', subscriptionPlan, '| Ciclo:', billingCycle, '| Inicio:', startDate.toISOString(), '| Fin:', endDate.toISOString())

    const { data: orgId, error: rpcError } = await supabaseAdmin.rpc('provision_workshop_account', {
        p_owner_id: authData.user.id, p_name: workshopName, p_slug: slug,
        p_phone: workshopPhone || phone, p_city: city, p_is_trial: false,
        p_plan: subscriptionPlan, p_start: startDate.toISOString(), p_end: endDate.toISOString(),
        p_tax_identifier: nit || null, p_cycle: billingCycle,
        p_transaction_id: verifiedPayment.id, p_amount: verifiedPayment.amount_in_cents / 100,
    });

    if (rpcError) {
        console.error('❌ Error creando taller via RPC:', rpcError.message, rpcError)
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
        if (rpcError.code === '23505') {
            return { error: 'Ese identificador de taller ya está en uso. Elige otro.', fields: data }
        }
        return { error: 'Error al crear el taller: ' + rpcError.message, fields: data }
    }
    console.log('✅ Taller y owner creados. ID:', orgId)

    // Try to send WhatsApp notification with credentials
    if (phone) {
        await sendOwnerWelcomeNotification(
            phone,
            fullName,
            workshopName,
            subscriptionPlan,
            startDate,
            endDate,
            generatedPassword
        ).catch(e => console.error('⚠️ Failed to send WhatsApp owner welcome template:', e));
    }

    console.log('✅ ===== REGISTRO COMPLETADO → redirigiendo a / =====\n')
    redirect('/?firstLogin=true')
}

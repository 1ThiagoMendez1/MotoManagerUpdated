'use server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@/lib/supabase/managed-client';
import { sendAccessCodeNotification } from '@/lib/whatsapp';

export async function updateWorkshopStatus(workshopId: string, status: any) {
    await requireSuperAdmin(); return { success: true }; }
export async function updateCancellationStatus(cancellationId: string, status: any, adminNotes?: string) {
    await requireSuperAdmin(); return { success: true }; }
export async function updateWorkshopPlan(workshopId: string, plan: string) {
    await requireSuperAdmin();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workshopId) ||
        !['basic', 'pro', 'full'].includes(plan)) {
        return { success: false, error: 'Taller o plan inválido.' };
    }

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    // El RPC actualiza exclusivamente dos claves JSON, sin borrar horarios,
    // preferencias, contador WhatsApp ni cambios simultáneos del taller.
    const { data: updated, error } = await supabaseAdmin.rpc(
        'set_organization_subscription_plan',
        { p_organization_id: workshopId, p_plan: plan }
    );
    if (error || updated !== true) {
        console.error('[admin] No se pudo actualizar el plan del taller:', error?.code || 'not_found');
        return { success: false, error: 'No se pudo guardar el plan. Verifica la migración SQL y que exista el taller.' };
    }
    revalidatePath('/admin');
    revalidatePath('/dashboard/subscription');
    return { success: true };
}
export async function updateUserEmail(userId: string, newEmail: string) {
    await requireSuperAdmin(); return { success: true }; }
export async function updateUserPassword(userId: string, newPassword: string) {
    await requireSuperAdmin(); return { success: true }; }

export async function createUser(data: any) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
    
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        app_metadata: { is_super_admin: data.isSuperAdmin === true },
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: data.name,

        }
    });

    if (authError || !authData.user) {
        throw new Error(authError?.message || 'Error al crear usuario en autenticación');
    }

    const newUserId = authData.user.id;
    
    await supabaseAdmin
        .from('profiles')
        .update({ 
            phone: data.phone
        })
        .eq('id', newUserId);

    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUser(userId: string) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/users');
    return { success: true };
}

export async function updateUser(userId: string, data: any) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const updatePayload: any = {
        app_metadata: { is_super_admin: data.isSuperAdmin === true },
        email: data.email,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: data.name,

        }
    };
    
    if (data.password) {
        updatePayload.password = data.password;
    }
    
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    
    if (authError) {
        throw new Error(authError.message);
    }
    
    await supabaseAdmin
        .from('profiles')
        .update({ 
            first_name: firstName,
            last_name: lastName,
            phone: data.phone
        })
        .eq('id', userId);
        
    revalidatePath('/admin/users');
    return { success: true };
}

export async function getWorkshopCredentials(userId: string) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
        console.error('Error fetching workshop credentials:', error);
        return { error: error?.message || 'Usuario no encontrado' };
    }

    // Query profiles for the phone number
    const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .single();

    return {
        email: data.user.email || '',
        password: data.user.user_metadata?.temp_password || 'Sin contraseña temporal',
        phone: profileData?.phone || data.user.user_metadata?.phone || ''
    };
}

export async function sendCredentialsViaWhatsApp(userId: string) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get phone from profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('id', userId)
        .single();

    const targetPhone = profileData?.phone;
    if (profileError || !targetPhone) {
        return { success: false, error: 'El propietario no tiene un teléfono registrado' };
    }

    // Get the user's current temporary password or generate one if missing
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !userData.user) {
        return { success: false, error: 'Usuario no encontrado' };
    }

    let tempPassword = userData.user.user_metadata?.temp_password;
    if (!tempPassword) {
        tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: tempPassword,
            user_metadata: {
                ...userData.user.user_metadata,
                temp_password: tempPassword,
                needs_password_change: true
            }
        });
        if (updateError) {
            return { success: false, error: `Error al generar contraseña: ${updateError.message}` };
        }
    }

    console.log(`Sending credentials via WhatsApp to ${targetPhone}...`);
    const wsRes = await sendAccessCodeNotification(targetPhone, tempPassword);
    if (!wsRes.success) {
        console.error('Failed to send WhatsApp code:', wsRes.error);
        const errorMsg = typeof wsRes.error === 'object' ? JSON.stringify(wsRes.error) : wsRes.error;
        return { 
            success: false, 
            error: `Error al enviar WhatsApp: ${errorMsg}` 
        };
    }

    return { success: true };
}

export async function resetUserPasswordAndNotify(userId: string, email: string, phone: string | undefined, name: string) {
    await requireSuperAdmin();
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate new 6-digit OTP code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`Resetting password for user ${userId} to: ${newCode}`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newCode,
        user_metadata: {
            temp_password: newCode,
            needs_password_change: true
        }
    });

    if (updateError) {
        console.error('Error updating user password in Supabase:', updateError);
        return { success: false, error: updateError.message };
    }

    if (phone) {
        console.log(`Sending new code via WhatsApp to ${phone}...`);
        const wsRes = await sendAccessCodeNotification(phone, newCode);
        if (!wsRes.success) {
            console.error('Failed to send WhatsApp code:', wsRes.error);
            const errorMsg = typeof wsRes.error === 'object' ? JSON.stringify(wsRes.error) : wsRes.error;
            return { 
                success: false, 
                error: `Contraseña restablecida en BD pero falló el envío de WhatsApp: ${errorMsg}` 
            };
        }
    }

    return { success: true, tempPassword: newCode };
}

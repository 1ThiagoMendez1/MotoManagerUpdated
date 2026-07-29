'use server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendAccessCodeNotification } from '@/lib/whatsapp';

export async function updateWorkshopStatus(workshopId: string, status: any) { return { success: true }; }
export async function updateCancellationStatus(cancellationId: string, status: any, adminNotes?: string) { return { success: true }; }
export async function updateWorkshopPlan(workshopId: string, plan: any) { return { success: true }; }
export async function updateUserEmail(userId: string, newEmail: string) { return { success: true }; }
export async function updateUserPassword(userId: string, newPassword: string) { return { success: true }; }

export async function createUser(data: any) {
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: data.name,
            is_super_admin: data.isSuperAdmin,
        }
    });

    if (authError || !authData.user) {
        throw new Error(authError?.message || 'Error al crear usuario en autenticación');
    }

    const newUserId = authData.user.id;
    
    await supabaseAdmin
        .from('profiles')
        .update({ 
            phone: data.phone,
            is_super_admin: data.isSuperAdmin
        })
        .eq('id', newUserId);

    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUser(userId: string) {
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    
    revalidatePath('/admin/users');
    return { success: true };
}

export async function updateUser(userId: string, data: any) {
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const updatePayload: any = {
        email: data.email,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: data.name,
            is_super_admin: data.isSuperAdmin,
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
            phone: data.phone,
            is_super_admin: data.isSuperAdmin
        })
        .eq('id', userId);
        
    revalidatePath('/admin/users');
    return { success: true };
}

export async function getWorkshopCredentials(userId: string) {
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

    return {
        email: data.user.email || '',
        password: data.user.user_metadata?.temp_password || 'Sin contraseña temporal',
        phone: data.user.user_metadata?.phone || ''
    };
}

export async function resetUserPasswordAndNotify(userId: string, email: string, phone: string | undefined, name: string) {
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

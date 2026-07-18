'use server';

import { createClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// We need a Service Role client for auth management operations
const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function updateWorkshopStatus(workshopId: string, status: 'active' | 'past_due' | 'canceled' | 'trialing') {
    await requireSuperAdmin();
    const supabase = await createClient();

    const { error } = await supabase
        .from('workshops')
        .update({ subscription_status: status })
        .eq('id', workshopId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin');
}

export async function updateCancellationStatus(cancellationId: string, status: 'pending' | 'contacted' | 'resolved' | 'lost', adminNotes?: string) {
    await requireSuperAdmin();
    const supabase = await createClient();

    const payload: any = { status };
    if (adminNotes !== undefined) {
        payload.admin_notes = adminNotes;
    }

    const { error } = await supabase
        .from('cancellation_feedback')
        .update(payload)
        .eq('id', cancellationId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin');
}

export async function updateWorkshopPlan(workshopId: string, plan: 'monthly' | 'biannual' | 'yearly') {
    await requireSuperAdmin();
    const supabase = await createClient();

    const startDate = new Date();
    const endDate = new Date(startDate);

    // Calculate end date based on plan
    if (plan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === 'biannual') {
        endDate.setMonth(endDate.getMonth() + 6);
    } else if (plan === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const { error } = await supabase
        .from('workshops')
        .update({
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString()
        })
        .eq('id', workshopId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin');
}

export async function updateUserEmail(userId: string, newEmail: string) {
    await requireSuperAdmin();

    // Update Auth User (Requires Service Role)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true }
    );

    if (authError) throw new Error(authError.message);

    revalidatePath('/admin');
}

export async function updateUserPassword(userId: string, newPassword: string) {
    await requireSuperAdmin();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) throw new Error(error.message);
    revalidatePath('/admin');
}

export async function createUser(data: { email: string; password: string; name: string; phone?: string; isSuperAdmin: boolean }) {
    await requireSuperAdmin();

    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            name: data.name,
            phone: data.phone
        }
    });

    if (error) throw new Error(error.message);

    // If Super Admin, update profile
    if (data.isSuperAdmin && user.user) {
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update({ is_super_admin: true, name: data.name, phone: data.phone })
            .eq('id', user.user.id);

        if (profileError) {
            // If update fails (e.g. row doesn't exist yet), insert it
            await supabaseAdmin.from('user_profiles').upsert({
                id: user.user.id,
                email: data.email,
                name: data.name,
                phone: data.phone,
                is_super_admin: true
            });
        }
        
        // Notify via WhatsApp
        if (data.phone && data.password) {
            const { sendSuperAdminWelcomeNotification } = await import('@/lib/whatsapp');
            await sendSuperAdminWelcomeNotification(data.phone, data.name, data.email, data.password);
        }
    }

    revalidatePath('/admin');
    return { success: true };
}

export async function deleteUser(userId: string) {
    await requireSuperAdmin();

    // 1. Eliminar asociaciones en workshop_members (por si no hay cascade)
    await supabaseAdmin.from('workshop_members').delete().eq('user_id', userId);
    
    // 2. Eliminar el perfil público del usuario
    await supabaseAdmin.from('user_profiles').delete().eq('id', userId);

    // 3. Eliminar de auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
        // Si el usuario ya fue eliminado de auth.users, el error se puede ignorar
        // ya que el objetivo principal (quitarlo de la vista) se cumple borrando su perfil.
        console.error("Notice: Error deleting auth user (might already be deleted):", error.message);
    }

    revalidatePath('/admin');
}

export async function updateUser(userId: string, data: { email: string; name: string; phone?: string; isSuperAdmin: boolean; password?: string }) {
    await requireSuperAdmin();

    // 1. Update Auth User (Email, Phone, Password)
    const authUpdates: any = {
        email: data.email,
        email_confirm: true,
        user_metadata: {
            name: data.name,
            phone: data.phone
        }
    };
    if (data.password && data.password.length >= 6) {
        authUpdates.password = data.password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
    if (authError) throw new Error(authError.message);

    // 2. Update Public Profile (Name, Phone, Super Admin Status)
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({
            name: data.name,
            phone: data.phone,
            is_super_admin: data.isSuperAdmin,
            email: data.email // Keep email in sync if we store it there too
        })
        .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    revalidatePath('/admin');
    return { success: true };
}

export async function getWorkshopCredentials(userId: string) {
    await requireSuperAdmin();

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw new Error(error.message);

    const tempPassword = data.user.user_metadata?.temp_password;
    if (!tempPassword) {
        return { error: 'No se encontraron credenciales generadas automáticamente para este usuario.' };
    }

    return { 
        email: data.user.email,
        password: tempPassword,
        phone: data.user.user_metadata?.phone || data.user.phone
    };
}

import { sendPasswordResetNotification } from '@/lib/whatsapp';

export async function resetUserPasswordAndNotify(userId: string, email: string, phone: string | undefined, name: string) {
    await requireSuperAdmin();

    if (!phone) {
        throw new Error('El usuario no tiene un número de teléfono registrado para enviar la contraseña.');
    }

    // Generar una contraseña aleatoria de 8 caracteres
    const newPassword = Math.random().toString(36).slice(-8);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) throw new Error(error.message);

    // Enviar notificación de whatsapp
    const result = await sendPasswordResetNotification(phone, name || 'Usuario', email, newPassword);

    revalidatePath('/admin');
    
    if (!result.success) {
        throw new Error('Contraseña actualizada, pero hubo un error enviando el WhatsApp: ' + result.error);
    }
    
    return { success: true };
}

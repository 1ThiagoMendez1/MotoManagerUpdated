'use server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

export async function getWorkshopCredentials(userId: string) { return { email: 'mock@demo.com', password: 'password', phone: '123' }; }
export async function resetUserPasswordAndNotify(userId: string, email: string, phone: string | undefined, name: string) { return { success: true }; }

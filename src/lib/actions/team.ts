'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { sendCredentialsNotification } from '@/lib/whatsapp';



export async function inviteUser(data: {
  name: string;
  email: string;
  phone: string;
  role: string;
  workshopName: string; // Keeping for backwards compatibility with UI if needed
}) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      throw new Error('No estás autenticado o no estás asociado a ningún taller');
    }

    const workshopDetails = await getWorkshopDetails();
    if (!workshopDetails) {
      throw new Error('No se encontraron detalles de tu taller');
    }

    // Create Supabase Admin client to bypass RLS and create users
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Error al crear usuario en autenticación');
    }

    const newUserId = authData.user.id;

    // 2. Assign user to the current workshop in workshop_members
    const { error: memberError } = await supabaseAdmin
      .from('workshop_members')
      .insert({
        user_id: newUserId,
        workshop_id: currentUser.workshopId,
        role: data.role
      });

    if (memberError) {
      // If assignment fails, we should ideally delete the auth user to keep consistency
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error('Error al asignar usuario al taller: ' + memberError.message);
    }

    // 3. If role is mechanic, add to technicians table for work orders
    if (data.role === 'mechanic' || data.role === 'Técnico') {
      const { error: techError } = await supabaseAdmin
        .from('tecnicos_activos')
        .insert({
          workshop_id: currentUser.workshopId,
          name: data.name,
          is_active: true
        });
      
      if (techError) {
        console.error('Error adding to technicians table:', techError);
        // Not failing the whole process if this minor step fails, but logging it.
      }
    }

    // 4. Send WhatsApp Notification
    const result = await sendCredentialsNotification(
      data.phone,
      data.name,
      workshopDetails.name,
      workshopDetails.slug || 'taller',
      data.email,
      tempPassword
    );

    return { success: true, result };
  } catch (error: any) {
    console.error('Error in inviteUser action:', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamMembers() {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      return [];
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('workshop_members')
      .select(`
        role,
        user_profiles (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('workshop_id', currentUser.workshopId);

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    return (data || []).map((member: any) => {
      const profile = member.user_profiles || {};
      return {
        id: profile.id,
        name: profile.name || 'Usuario',
        email: profile.email || '',
        role: member.role,
        avatar: profile.avatar_url || '',
        status: 'active' // By default, if they are in the table, they are active
      };
    });

  } catch (error) {
    console.error('Failed to get team members:', error);
    return [];
  }
}

export async function updateUserRole(userIdToUpdate: string, newRole: string) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      throw new Error('No estás autenticado o no estás asociado a ningún taller');
    }

    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      throw new Error('No tienes permisos para cambiar roles');
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('workshop_members')
      .update({ role: newRole })
      .eq('user_id', userIdToUpdate)
      .eq('workshop_id', currentUser.workshopId);

    if (error) {
      throw new Error('Error al actualizar el rol: ' + error.message);
    }

    // Si el nuevo rol es mecánico, asegurarnos de que esté en tecnicos_activos
    if (newRole === 'mechanic' || newRole === 'Técnico') {
      // 1. Obtener el nombre del usuario
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('name')
        .eq('id', userIdToUpdate)
        .single();
        
      if (profile && profile.name) {
        // 2. Verificar si ya existe en tecnicos_activos para este taller con ese nombre
        const { data: existingTech } = await supabaseAdmin
          .from('tecnicos_activos')
          .select('id')
          .eq('workshop_id', currentUser.workshopId)
          .eq('name', profile.name)
          .maybeSingle();
          
        // 3. Si no existe, lo agregamos
        if (!existingTech) {
          await supabaseAdmin
            .from('tecnicos_activos')
            .insert({
              workshop_id: currentUser.workshopId,
              name: profile.name,
              is_active: true
            });
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message };
  }
}

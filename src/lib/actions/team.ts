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
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    console.log(`\n=============================================`);
    console.log(`🔑 OTP Generado para nuevo usuario: ${tempPassword}`);
    console.log(`=============================================\n`);

    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: data.name,
        temp_password: tempPassword,
        needs_password_change: true
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Error al crear usuario en autenticación');
    }

    const newUserId = authData.user.id;
    
    // Update the profile phone number if provided (the trigger creates the profile without phone)
    if (data.phone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone: data.phone })
        .eq('id', newUserId);
    }

    // 2. Assign user to the current workshop in organization_members
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        user_id: newUserId,
        organization_id: currentUser.workshopId,
        role: data.role === 'receptionist' ? 'service_advisor' : data.role
      });

    if (memberError) {
      // If assignment fails, we should ideally delete the auth user to keep consistency
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error('Error al asignar usuario al taller: ' + memberError.message);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    // 4. Send WhatsApp Notification
    const result = await sendCredentialsNotification(
      data.phone,
      data.name,
      workshopDetails.name,
      workshopDetails.slug || 'taller',
      data.email,
      loginUrl,
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

    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        user_id,
        profiles (
          id,
          first_name,
          last_name,
          avatar_path,
          phone
        )
      `)
      .eq('organization_id', currentUser.workshopId);

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const usersMap = new Map();
    if (authData && authData.users) {
       authData.users.forEach(u => usersMap.set(u.id, u.email));
    }

    const result = (members || []).map((member: any) => {
      const profile = member.profiles || {};
      return {
        id: member.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || usersMap.get(member.user_id) || 'Usuario',
        email: usersMap.get(member.user_id) || '',
        phone: profile.phone || '',
        role: member.role,
        avatar: profile.avatar_path || '',
        status: 'active'
      };
    });
    
    // DEBUG LOG
    require('fs').writeFileSync('team_debug.log', JSON.stringify({
      workshopId: currentUser.workshopId,
      membersLength: members?.length,
      resultLength: result.length,
      firstMember: result[0]
    }, null, 2));

    return result;

  } catch (error: any) {
    console.error('Failed to get team members:', error);
    require('fs').writeFileSync('team_debug.error.log', error.toString());
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

    const dbRole = newRole === 'receptionist' ? 'service_advisor' : newRole;

    const { error } = await supabaseAdmin
      .from('organization_members')
      .update({ role: dbRole })
      .eq('user_id', userIdToUpdate)
      .eq('organization_id', currentUser.workshopId);

    if (error) {
      throw new Error('Error al actualizar el rol: ' + error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message };
  }
}

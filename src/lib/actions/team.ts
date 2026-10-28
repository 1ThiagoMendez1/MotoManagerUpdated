'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient as createSupabaseClient } from '@/lib/supabase/managed-client';

import { sendCredentialsNotification } from '@/lib/whatsapp';
import { getPlanLimits } from '@/lib/constants/plans';
import { randomBytes } from 'node:crypto';



export async function inviteUser(data: {
  name: string;
  email: string;
  phone: string;
  role: string;
  workshopName: string; // Keeping for backwards compatibility with UI if needed
}) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId || currentUser.role !== 'owner') {
      throw new Error('Solo el propietario del taller puede invitar usuarios.');
    }
    const allowedRoles = ['admin','mechanic','receptionist','service_advisor'];
    if (!allowedRoles.includes(data.role)) throw new Error('Rol de invitación inválido.');

    const workshopDetails = await getWorkshopDetails();
    if (!workshopDetails) {
      throw new Error('No se encontraron detalles de tu taller');
    }

    // Verify user limit against current plan
    const planLimits = getPlanLimits(workshopDetails.subscription_plan || 'basic');
    if (planLimits.users_limit !== -1) {
      const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

      if (planLimits.id === 'basic') {
        const roleToCheck = data.role === 'receptionist' ? 'service_advisor' : data.role;
        const { count } = await supabaseAdmin
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentUser.workshopId)
          .eq('role', roleToCheck);

        if (count !== null && count >= 1) {
          throw new Error(`Límite alcanzado: El plan ${planLimits.name} permite máximo 1 usuario por rol.`);
        }
      } else {
        const { count } = await supabaseAdmin
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentUser.workshopId);

        if (count !== null && count >= planLimits.users_limit) {
          throw new Error(`Límite de usuarios alcanzado para el plan ${planLimits.name}. Actualiza tu plan para invitar a más usuarios.`);
        }
      }
    }

    // Create Supabase Admin client to bypass RLS and create users
    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    // Credencial temporal criptográficamente aleatoria, sin logs ni metadata.
    const tempPassword = randomBytes(24).toString('base64url') + 'A1!';

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
      tempPassword,
      data.role
    );

    return { success: true, result, tempPassword, loginUrl, email: data.email };
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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        custom_permissions,
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

    const usersMap = new Map<string, string>();
    await Promise.all((members || []).map(async (member: any) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      if (data?.user?.email) usersMap.set(member.user_id, data.user.email);
    }));

    const result = (members || []).map((member: any) => {
      const profile = member.profiles || {};
      return {
        id: member.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || usersMap.get(member.user_id) || 'Usuario',
        email: usersMap.get(member.user_id) || '',
        phone: profile.phone || '',
        role: member.role,
        customPermissions: member.custom_permissions || null,
        avatar: profile.avatar_path || '',
        status: 'active'
      };
    });
    
    return result;

  } catch (error: any) {
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

    if (currentUser.role !== 'owner') {
      throw new Error('No tienes permisos para cambiar roles');
    }

    const workshopDetails = await getWorkshopDetails();
    if (!workshopDetails) {
      throw new Error('No se encontraron detalles de tu taller');
    }

    const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

    const dbRole = newRole === 'receptionist' ? 'service_advisor' : newRole;
    if (!['admin','mechanic','service_advisor'].includes(dbRole)) {
      throw new Error('Rol no permitido desde este módulo.');
    }
    const { data: existingMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role').eq('user_id', userIdToUpdate)
      .eq('organization_id', currentUser.workshopId).single();
    if (!existingMembership || existingMembership.role === 'owner') {
      throw new Error('No se puede modificar al propietario ni a usuarios de otros talleres.');
    }

    const planLimits = getPlanLimits(workshopDetails.subscription_plan || 'basic');
    if (planLimits.id === 'basic') {
      const { count } = await supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentUser.workshopId)
        .eq('role', dbRole);

      if (count !== null && count >= 1) {
        throw new Error(`Límite alcanzado: El plan ${planLimits.name} permite máximo 1 usuario por rol.`);
      }
    }

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

export async function updateUserPermissions(userIdToUpdate: string, permissions: string[] | null) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      throw new Error('No estás autenticado o no estás asociado a ningún taller');
    }

    if (currentUser.role !== 'owner') {
      throw new Error('No tienes permisos para cambiar permisos de usuario');
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    if (permissions && (!Array.isArray(permissions) || permissions.length > 20 ||
        permissions.some(p => typeof p !== 'string' || ![
          '/dashboard','/motorcycles','/customers','/work-orders','/inventory',
          '/technicians','/sales','/appointments','/accounting','/services'
        ].includes(p)))) {
      throw new Error('La lista de permisos no es válida.');
    }
    const { data: memberForPermissions } = await supabaseAdmin.from('organization_members')
      .select('role').eq('user_id', userIdToUpdate)
      .eq('organization_id', currentUser.workshopId).single();
    if (!memberForPermissions || memberForPermissions.role === 'owner') {
      throw new Error('No se pueden modificar permisos del propietario ni de otro taller.');
    }
    const { error } = await supabaseAdmin
      .from('organization_members')
      .update({ custom_permissions: permissions })
      .eq('user_id', userIdToUpdate)
      .eq('organization_id', currentUser.workshopId);

    if (error) {
      throw new Error('Error al actualizar permisos: ' + error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserPermissions:', error);
    return { success: false, error: error.message };
  }
}

export async function updateTeamMemberInfo(userIdToUpdate: string, data: { name: string; phone: string; email?: string }) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      throw new Error('No estás autenticado o no estás asociado a ningún taller');
    }

    if (currentUser.role !== 'owner') {
      throw new Error('No tienes permisos para editar la información de los usuarios');
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: memberForEdit } = await supabaseAdmin.from('organization_members')
      .select('role').eq('user_id', userIdToUpdate)
      .eq('organization_id', currentUser.workshopId).single();
    if (!memberForEdit || memberForEdit.role === 'owner') {
      throw new Error('No se puede editar a un propietario ni a usuarios ajenos.');
    }
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Actualizar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: data.phone
      })
      .eq('id', userIdToUpdate);

    if (profileError) {
      throw new Error('Error al actualizar el perfil: ' + profileError.message);
    }

    // Actualizar correo en Auth si fue provisto
    if (data.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userIdToUpdate,
        {
          email: data.email,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: data.name
          }
        }
      );
      if (authError) {
        console.warn('Aviso al actualizar correo en Auth:', authError.message);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateTeamMemberInfo:', error);
    return { success: false, error: error.message };
  }
}

export async function removeUserFromTeam(userIdToRemove: string) {
  try {
    const currentUser = await getCurrentUserServer();
    if (!currentUser || !currentUser.workshopId) {
      throw new Error('No estás autenticado o no estás asociado a ningún taller');
    }

    if (currentUser.role !== 'owner') {
      throw new Error('No tienes permisos para revocar acceso a miembros');
    }

    if (currentUser.userId === userIdToRemove) {
      throw new Error('No puedes eliminar tu propia cuenta desde este módulo');
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: memberForRemoval } = await supabaseAdmin.from('organization_members')
      .select('role').eq('user_id', userIdToRemove)
      .eq('organization_id', currentUser.workshopId).single();
    if (!memberForRemoval || memberForRemoval.role === 'owner') {
      throw new Error('No se puede retirar a un propietario ni a usuarios ajenos.');
    }
    // Revocar únicamente esta membresía. Conservar la cuenta Auth y otras organizaciones.
    const { error: deleteMemberError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('user_id', userIdToRemove)
      .eq('organization_id', currentUser.workshopId);

    if (deleteMemberError) {
      throw new Error('Error al revocar acceso del taller: ' + deleteMemberError.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in removeUserFromTeam:', error);
    return { success: false, error: error.message };
  }
}


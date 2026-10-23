'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache'
import { parseBusinessHours } from '@/lib/business-hours';

/**
 * Obtiene los datos actuales del perfil del taller y del usuario dueño.
 */
export async function getProfileData() {
  const user = await requireWorkshop()
  const supabase = await createClient();

  const [{ data: workshop }, { data: profile }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, slug, phone, settings')
      .eq('id', user.workshopId!)
      .single(),
    supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', user.userId)
      .single(),
  ])

  const settings = workshop?.settings || {};
  
  const ownerNameFallback = user.user_metadata?.first_name 
    ? `${user.user_metadata.first_name} ${user.user_metadata?.last_name || ''}`.trim() 
    : user.email?.split('@')[0];

  const profileNameFallback = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
    : '';

  return {
    workshopName: workshop?.name || '',
    workshopPhone: workshop?.phone || '',
    workshopAddress: settings.address || '',
    workshopCity: settings.city || '',
    workshopNit: settings.nit || '',
    workshopMapsLink: settings.maps_link || '',
    ownerName: profileNameFallback || ownerNameFallback || '',
    ownerPhone: profile?.phone || '',
    email: user.email || '',
    userRole: user.role,
    workshopSlug: workshop?.slug || '',
    enrollmentEnabled: settings.customer_enrollment_enabled === true,
    businessHours: parseBusinessHours(settings.business_hours),
  }
}

export async function setCustomerEnrollment(enabled: boolean) {
  const user = await requireWorkshop();
  if (!['owner', 'admin'].includes(user.role) || typeof enabled !== 'boolean') {
    return { error: 'Solo el propietario o administrador puede gestionar las inscripciones.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_workshop_enrollment', {
    p_organization_id: user.workshopId, p_enabled: enabled,
  });
  if (error) return { error: 'No se pudo cambiar el registro de clientes.' };
  revalidatePath('/dashboard/profile');
  return { success: true };
}

/**
 * Actualiza los datos del taller y del perfil del usuario.
 */
export async function updateProfileData(formData: FormData) {
  const user = await requireWorkshop()
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  const workshopName = (formData.get('workshopName') as string)?.trim()
  const workshopPhone = (formData.get('workshopPhone') as string)?.trim() || null
  const workshopAddress = (formData.get('workshopAddress') as string)?.trim() || null
  const workshopCity = (formData.get('workshopCity') as string)?.trim() || null
  const workshopNit = (formData.get('workshopNit') as string)?.trim() || null
  const workshopMapsLink = (formData.get('workshopMapsLink') as string)?.trim() || null
  const ownerName = (formData.get('ownerName') as string)?.trim()
  const ownerPhone = (formData.get('ownerPhone') as string)?.trim() || null

  if (user.role === 'owner' && !workshopName) {
    return { error: 'El nombre del taller es obligatorio.' }
  }
  if (!ownerName) {
    return { error: 'El nombre del propietario es obligatorio.' }
  }

  if (user.role === 'owner') {
    // Actualización SQL atómica: el formulario no reemplaza el JSON entero.
    // Así, cambios simultáneos de horarios/QR no se pierden.
    const { error: workshopError } = await supabase.rpc('update_workshop_profile_fields', {
      p_organization_id: user.workshopId,
      p_name: workshopName,
      p_phone: workshopPhone,
      p_address: workshopAddress,
      p_city: workshopCity,
      p_nit: workshopNit,
      p_maps_link: workshopMapsLink,
    });
    if (workshopError) {
      console.error('[updateProfileData] Organization update failed');
      return { error: 'Error al actualizar los datos del taller.' };
    }
  }

  const first_name = ownerName.split(' ')[0];
  const last_name = ownerName.split(' ').slice(1).join(' ');

  // Actualizar datos del perfil de usuario
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.userId,
      first_name,
      last_name,
      phone: ownerPhone,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('[updateProfileData] Profile error:', profileError)
    return { error: 'Error al actualizar los datos del perfil.' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}


export async function setWorkshopBusinessHours(raw: unknown) {
  const user = await requireWorkshop();
  if (!user.workshopId || !['owner', 'admin'].includes(user.role)) {
    return { error: 'Solo propietarios o administradores pueden modificar horarios.' };
  }
  const hours = parseBusinessHours(raw);
  if (!hours) return { error: 'Revisa que los intervalos sean válidos y no se superpongan.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_workshop_business_hours', {
    p_organization_id: user.workshopId,
    p_hours: hours,
  });
  if (error) return { error: 'No se pudieron guardar los horarios del taller.' };
  revalidatePath('/dashboard/profile');
  return { success: true };
}

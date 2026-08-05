'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache'

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
    email: user.email,
    userRole: user.role,
  }
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
    // Fetch existing settings to not overwrite them
    const { data: currentOrg } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', user.workshopId!)
      .single();
    const currentSettings = currentOrg?.settings || {};

    // Actualizar datos del taller
    const { error: workshopError } = await supabaseAdmin
      .from('organizations')
      .update({
        name: workshopName,
        phone: workshopPhone,
        settings: {
          ...currentSettings,
          address: workshopAddress,
          city: workshopCity,
          nit: workshopNit,
          maps_link: workshopMapsLink,
        }
      })
      .eq('id', user.workshopId!)

    if (workshopError) {
      console.error('[updateProfileData] Organization error:', workshopError)
      return { error: 'Error al actualizar los datos del taller.' }
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

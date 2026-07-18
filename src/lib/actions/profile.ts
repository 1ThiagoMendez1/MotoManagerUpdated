'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireWorkshop } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene los datos actuales del perfil del taller y del usuario dueño.
 */
export async function getProfileData() {
  const user = await requireWorkshop()
  const supabase = await createClient()

  const [{ data: workshop }, { data: profile }] = await Promise.all([
    supabase
      .from('workshops')
      .select('name, slug, phone, address, city, nit')
      .eq('id', user.workshopId!)
      .single(),
    supabase
      .from('user_profiles')
      .select('name, phone')
      .eq('id', user.userId)
      .single(),
  ])

  return {
    workshopName: workshop?.name || '',
    workshopPhone: workshop?.phone || '',
    workshopAddress: workshop?.address || '',
    workshopCity: workshop?.city || '',
    workshopNit: workshop?.nit || '',
    ownerName: profile?.name || '',
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
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const workshopName = (formData.get('workshopName') as string)?.trim()
  const workshopPhone = (formData.get('workshopPhone') as string)?.trim() || null
  const workshopAddress = (formData.get('workshopAddress') as string)?.trim() || null
  const workshopCity = (formData.get('workshopCity') as string)?.trim() || null
  const workshopNit = (formData.get('workshopNit') as string)?.trim() || null
  const ownerName = (formData.get('ownerName') as string)?.trim()
  const ownerPhone = (formData.get('ownerPhone') as string)?.trim() || null

  if (user.role === 'owner' && !workshopName) {
    return { error: 'El nombre del taller es obligatorio.' }
  }
  if (!ownerName) {
    return { error: 'El nombre del propietario es obligatorio.' }
  }

  if (user.role === 'owner') {
    // Actualizar datos del taller
    const { error: workshopError } = await supabaseAdmin
      .from('workshops')
      .update({
        name: workshopName,
        phone: workshopPhone,
        address: workshopAddress,
        city: workshopCity,
        nit: workshopNit,
      })
      .eq('id', user.workshopId!)

    if (workshopError) {
      console.error('[updateProfileData] Workshop error:', workshopError)
      return { error: 'Error al actualizar los datos del taller.' }
    }
  }

  // Actualizar datos del perfil de usuario
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      name: ownerName,
      phone: ownerPhone,
    })
    .eq('id', user.userId)

  if (profileError) {
    console.error('[updateProfileData] Profile error:', profileError)
    return { error: 'Error al actualizar los datos del perfil.' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

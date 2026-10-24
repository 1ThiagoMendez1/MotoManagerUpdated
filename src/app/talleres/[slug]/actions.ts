'use server';

import { createClient } from '@/lib/supabase/server';
import { enrollmentSchema } from '@/lib/workshops/enrollment';
import { revalidatePath } from 'next/cache';

export async function enrollCustomer(formData: FormData) {
  const parsed = enrollmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Revisa tu nombre, apellidos, teléfono y autorización.' };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email_confirmed_at) return { error: 'Verifica tu correo para continuar.' };
  const { slug, firstName, lastName, phone, plate, brand, model } = parsed.data;
  const result = await supabase.rpc('join_workshop_as_customer', {
    p_slug: slug, p_first_name: firstName, p_last_name: lastName, p_phone: phone, p_consent: true,
  });
  if (result.error) {
    return { error: result.error.code === '23505'
      ? 'Pide al taller que revise la asociación de tu ficha existente.'
      : 'No fue posible completar el registro. Comprueba que el taller tenga las inscripciones activas.' };
  }
  // The user is now linked. Intake creation is separately authenticated and
  // atomically notifies the workshop. Never add a motorcycle from unverified QR data.
  const { error: intakeError } = await supabase.rpc('submit_customer_intake', {
    p_slug: slug, p_plate: plate || null, p_brand: brand || null, p_model: model || null,
  });
  if (intakeError) {
    console.warn('[customer-qr] Linked account but could not create staff intake');
    return { success: true, intakeWarning: 'Tu registro quedó vinculado, pero no se pudo avisar al taller. Comunícate con recepción.' };
  }
  revalidatePath('/customers/intake');
  return { success: true };
}

// Existing verified customers can propose another plate without re-registering.
export async function requestAnotherMotorcycle(formData: FormData) {
  const slug = String(formData.get('slug') || '');
  const plate = String(formData.get('plate') || '').replace(/[\s-]/g, '').toUpperCase();
  const brand = String(formData.get('brand') || '').trim();
  const model = String(formData.get('model') || '').trim();
  if (!/^[a-z0-9-]{1,150}$/.test(slug) || !/^[A-Z0-9]{5,8}$/.test(plate)
    || brand.length > 60 || model.length > 60) {
    return { error: 'Revisa la placa y los datos de la moto.' };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email_confirmed_at) return { error: 'Verifica tu correo primero.' };
  const { error } = await supabase.rpc('submit_customer_intake', {
    p_slug: slug, p_plate: plate, p_brand: brand || null, p_model: model || null,
  });
  if (error) return { error: 'No se pudo enviar la solicitud. Si ya la enviaste, recepción la tiene registrada.' };
  revalidatePath('/customers/intake');
  return { success: true };
}

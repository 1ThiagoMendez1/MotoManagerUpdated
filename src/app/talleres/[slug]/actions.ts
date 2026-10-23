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
  const { slug, firstName, lastName, phone } = parsed.data;
  const result = await supabase.rpc('join_workshop_as_customer', {
    p_slug: slug, p_first_name: firstName, p_last_name: lastName, p_phone: phone, p_consent: true,
  });
  if (result.error) {
    return { error: result.error.code === '23505'
      ? 'Pide al taller que revise la asociación de tu ficha existente.'
      : 'No fue posible completar el registro. Comprueba que el taller tenga las inscripciones activas.' };
  }
  revalidatePath('/customers');
  return { success: true };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { enrollmentSchema, publicStorefrontFromRow } from '@/lib/workshops/enrollment';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { workshopEmailSchema, workshopAuthFailure, workshopAuthResponseFailure, workshopCallbackUrl } from '@/lib/workshops/email-auth';
import { phoneMatchesAccount } from '@/lib/workshops/whatsapp-auth';

export async function requestWorkshopEmail(input: { slug: string; email: string; mode: 'new' | 'existing' }): Promise<{
  success?: boolean; error?: string; retryAfterSeconds?: number;
}> {
  const parsed = workshopEmailSchema.safeParse(input);
  if (!parsed.success) return { error: 'Revisa el correo electrónico y el taller.' };
  const { slug, email, mode } = parsed.data;
  // Next validates the Server Action's Origin against Host/X-Forwarded-Host.
  // Keep PKCE cookies and the callback on the browser's public origin behind Dokploy.
  const requestHeaders = await headers();
  const callback = workshopCallbackUrl(requestHeaders.get('origin') || process.env.NEXT_PUBLIC_APP_URL || null, slug);
  if (!callback) return { error: 'No se pudo preparar el enlace de acceso. Recarga la página e intenta de nuevo.' };
  try {
    const admin = createAdminClient();
    const { data, error: lookupError } = await admin.from('organizations')
      .select('id, name, slug, phone, status, settings').eq('slug', slug).maybeSingle();
    if (lookupError) {
      console.error('[workshop-email] Workshop lookup failed', { code: lookupError.code });
      return { error: 'No se pudo consultar el taller. Intenta de nuevo en unos minutos.' };
    }
    if (!publicStorefrontFromRow(data)?.enrollmentEnabled) return { error: 'Este taller no está recibiendo registros en este momento.' };
    let deliveryFailure: ReturnType<typeof workshopAuthResponseFailure> | undefined;
    const supabase = await createClient(async (input, init) => {
      const response = await fetch(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!response.ok && new URL(url).pathname.endsWith('/auth/v1/otp')) {
        try { deliveryFailure = workshopAuthResponseFailure(response.status, await response.clone().json()); }
        catch { /* A gateway may return non-JSON; retain the SDK's transport failure. */ }
      }
      return response;
    });
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: callback, shouldCreateUser: mode === 'new' },
    });
    if (error) {
      // Never log the address, passwords, tokens or full SMTP error.
      const failure = deliveryFailure || error;
      console.error('[workshop-email] Delivery failed', { code: failure.code || 'unknown', status: failure.status });
      return workshopAuthFailure(failure);
    }
    return { success: true, retryAfterSeconds: 60 };
  } catch {
    console.error('[workshop-email] Auth service unavailable');
    return { error: 'El servicio de acceso no está disponible. Intenta de nuevo en unos minutos.' };
  }
}

export async function enrollCustomer(formData: FormData) {
  const parsed = enrollmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Revisa tu nombre, apellidos, teléfono y autorización.' };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email_confirmed_at) return { error: 'Verifica tu cuenta para continuar.' };
  const { slug, firstName, lastName, phone, plate, brand, model } = parsed.data;
  if (!phoneMatchesAccount(user.email, phone)) return { error: 'Utiliza el mismo celular que verificaste por WhatsApp.' };
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
  if (authError || !user?.email_confirmed_at) return { error: 'Verifica tu cuenta primero.' };
  const { error } = await supabase.rpc('submit_customer_intake', {
    p_slug: slug, p_plate: plate, p_brand: brand || null, p_model: model || null,
  });
  if (error) return { error: 'No se pudo enviar la solicitud. Si ya la enviaste, recepción la tiene registrada.' };
  revalidatePath('/customers/intake');
  return { success: true };
}

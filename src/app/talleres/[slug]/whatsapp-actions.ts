'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateMobileCode, generateTemporaryPassword, hashMobileCode } from '@/lib/mobile-otp';
import { publicStorefrontFromRow } from '@/lib/workshops/enrollment';
import { deriveWorkshopQrPepper } from '@/lib/workshops/qr-secret';
import {
  qrCodeRequestSchema, qrCodeVerificationSchema, phoneAccountEmail, sendQrCodeViaMeta,
} from '@/lib/workshops/whatsapp-auth';

// Nunca se registra, ni devuelve al navegador, el código, su hash o la clave temporal.
async function activeWorkshop(slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('organizations')
    .select('id, name, slug, status, phone, settings').eq('slug', slug).maybeSingle();
  if (error) throw new Error('Workshop lookup unavailable');
  return publicStorefrontFromRow(data)?.enrollmentEnabled === true;
}

function qrSecret() {
  return deriveWorkshopQrPepper(process.env.MOBILE_OTP_PEPPER, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function configured() {
  return Boolean(qrSecret() && process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function requestWorkshopWhatsApp(input: { slug: string; phone: string }): Promise<{
  success?: boolean; error?: string; retryAfterSeconds?: number;
}> {
  const parsed = qrCodeRequestSchema.safeParse(input);
  if (!parsed.success) return { error: 'Ingresa un celular colombiano válido.' };
  if (!configured()) return { error: 'El acceso por WhatsApp aún no está configurado en este taller.' };
  const { slug, phone } = parsed.data;
  try {
    if (!await activeWorkshop(slug)) return { error: 'El taller no está recibiendo registros.' };
    const code = generateMobileCode();
    const admin = createAdminClient();
    const { data: issued, error } = await admin.rpc('issue_workshop_qr_otp', {
      p_phone: phone, p_slug: slug, p_code_hash: hashMobileCode(phone, code, qrSecret()!),
    });
    if (error) {
      console.error('[qr-whatsapp] OTP reservation unavailable', { code: error.code });
      return { error: 'No se pudo iniciar la verificación. Intenta más tarde.' };
    }
    if (!issued) return { error: 'Espera antes de solicitar otro código o intenta mañana.', retryAfterSeconds: 60 };
    const accepted = await sendQrCodeViaMeta(phone, code);
    if (!accepted) return { error: 'Meta no confirmó el envío. Comprueba que la plantilla codigo_registro_qr esté aprobada.' ,
      retryAfterSeconds: 60 };
    return { success: true, retryAfterSeconds: 60 };
  } catch {
    return { error: 'El servicio de verificación no está disponible. Intenta más tarde.' };
  }
}

export async function verifyWorkshopWhatsApp(input: { slug: string; phone: string; code: string }): Promise<{
  success?: boolean; error?: string;
}> {
  const parsed = qrCodeVerificationSchema.safeParse(input);
  if (!parsed.success) return { error: 'Comprueba el código de seis dígitos.' };
  if (!configured()) return { error: 'El acceso por WhatsApp no está disponible.' };
  const { slug, phone, code } = parsed.data;
  try {
    if (!await activeWorkshop(slug)) return { error: 'El taller no está recibiendo registros.' };
    const admin = createAdminClient();
    const { data: valid, error: verifyError } = await admin.rpc('consume_workshop_qr_otp', {
      p_phone: phone, p_slug: slug, p_code_hash: hashMobileCode(phone, code, qrSecret()!),
    });
    if (verifyError) return { error: 'No se pudo verificar el código. Intenta de nuevo.' };
    if (!valid) return { error: 'Código incorrecto, vencido o ya utilizado.' };

    // Solo tras consumir correctamente el código creamos o accedemos a una cuenta.
    // Se usa el mismo dominio interno del OTP móvil existente; jamás se enlaza
    // una cuenta de correo real basándose solo en un número proporcionado.
    const email = phoneAccountEmail(phone);
    const password = generateTemporaryPassword();
    const { data: existingId, error: lookupError } = await admin.rpc('find_workshop_qr_phone_account',
      { p_phone: phone });
    if (lookupError) return { error: 'No se pudo validar la cuenta móvil.' };
    if (existingId) {
      const { data: existing, error: fetchError } = await admin.auth.admin.getUserById(existingId);
      if (fetchError || existing.user?.email?.toLowerCase() !== email || !existing.user.email_confirmed_at)
        return { error: 'La cuenta necesita revisión del taller.' };
      const { error: rotateError } = await admin.auth.admin.updateUserById(existingId, { password });
      if (rotateError) return { error: 'No se pudo completar el acceso.' };
    } else {
      const { error: creationError } = await admin.auth.admin.createUser({
        email, email_confirm: true, password,
        user_metadata: { phone, qr_phone_verified: true },
      });
      if (creationError) return { error: 'No se pudo crear el acceso. Si ya tienes cuenta, consulta al taller.' };
    }

    const supabase = await createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) return { error: 'No se pudo abrir la sesión. Solicita un código nuevo.' };
    return { success: true };
  } catch {
    return { error: 'No se pudo completar el acceso. Solicita un código nuevo.' };
  }
}

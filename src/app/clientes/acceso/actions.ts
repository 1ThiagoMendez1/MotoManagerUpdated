'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateMobileCode, generateTemporaryPassword, hashMobileCode, normalizeMobilePhone } from '@/lib/mobile-otp';
import { deriveWorkshopQrPepper } from '@/lib/workshops/qr-secret';
import { phoneAccountEmail, sendQrCodeViaMeta } from '@/lib/workshops/whatsapp-auth';
import { CUSTOMER_PORTAL_OTP_SCOPE, eligibleCustomerLinks } from '@/lib/customer-portal-access';

type AccessReply = { success?: true; error?: string; retryAfterSeconds?: number };
const accessSent: AccessReply = { success: true, retryAfterSeconds: 60 };

/**
 * Only an existing, active workshop/customer relationship can receive an
 * independent portal code. Anonymous visitors cannot create users or link
 * plates here. The result deliberately avoids phone/account enumeration.
 */
async function linkedTechnicalAccount(phone: string) {
  const admin = createAdminClient();
  const { data: userId, error: lookupError } = await admin.rpc(
    'find_workshop_qr_phone_account', { p_phone: phone },
  );
  if (lookupError || typeof userId !== 'string') return null;

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
  if (accountError || !account.user?.email_confirmed_at
    || account.user.email?.toLowerCase() !== phoneAccountEmail(phone)) return null;

  const { data: links, error: linksError } = await admin
    .from('workshop_customer_accounts').select('organization_id, customer_id')
    .eq('user_id', userId).limit(100);
  if (linksError || !links?.length) return null;

  const ids = [...new Set(links.map(link => link.organization_id))];
  const { data: workshops, error: workshopError } = await admin
    .from('organizations').select('id').in('id', ids).eq('status', 'active');
  if (workshopError || !eligibleCustomerLinks(links, workshops || [])) return null;
  return { admin, userId, email: account.user.email.toLowerCase() };
}

function portalSecret() {
  return deriveWorkshopQrPepper(
    process.env.MOBILE_OTP_PEPPER,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function deliveryConfigured() {
  return Boolean(portalSecret()
    && process.env.WHATSAPP_API_TOKEN
    && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** For returning customers only. Reuses the already provisioned QR OTP table,
 * five-minute expiry, one-time use, cooldown and 24h send cap. */
export async function requestCustomerPortalCode(input: string): Promise<AccessReply> {
  const phone = normalizeMobilePhone(input);
  if (!phone) return { error: 'Ingresa un celular colombiano válido.' };
  if (!deliveryConfigured()) return { error: 'El acceso por WhatsApp no está disponible en este momento.' };

  try {
    const account = await linkedTechnicalAccount(phone);
    if (!account) return accessSent;
    const code = generateMobileCode();
    const { data: issued, error: issueError } = await account.admin.rpc(
      'issue_workshop_qr_otp',
      {
        p_phone: phone,
        p_slug: CUSTOMER_PORTAL_OTP_SCOPE,
        p_code_hash: hashMobileCode(phone, code, portalSecret()!),
      },
    );
    if (issueError) return { error: 'No fue posible solicitar el código. Intenta más tarde.' };
    if (issued) {
      // Only Meta's approved authentication template sends a code.
      // HTTP acceptance does not guarantee delivery; never log the code.
      const accepted = await sendQrCodeViaMeta(phone, code);
      if (!accepted) return { error: 'WhatsApp no confirmó el envío. Revisa el servicio e intenta más tarde.', retryAfterSeconds: 60 };
    }
    return accessSent;
  } catch {
    return { error: 'No se pudo solicitar el acceso. Intenta nuevamente.' };
  }
}

/** A stolen plate or an unlinked technical account never grants access. */
export async function verifyCustomerPortalCode(input: { phone: string; code: string }): Promise<AccessReply> {
  const phone = normalizeMobilePhone(input.phone);
  if (!phone || typeof input.code !== 'string' || !/^[0-9]{6}$/.test(input.code)) {
    return { error: 'Ingresa el código de seis dígitos.' };
  }
  if (!deliveryConfigured()) return { error: 'El acceso por WhatsApp no está disponible.' };

  try {
    const account = await linkedTechnicalAccount(phone);
    if (!account) return { error: 'No se pudo verificar el código o la vinculación con el taller.' };
    const { data: consumed, error: consumedError } = await account.admin.rpc(
      'consume_workshop_qr_otp',
      {
        p_phone: phone,
        p_slug: CUSTOMER_PORTAL_OTP_SCOPE,
        p_code_hash: hashMobileCode(phone, input.code, portalSecret()!),
      },
    );
    if (consumedError || !consumed) {
      return { error: 'Código incorrecto, vencido o ya utilizado.' };
    }

    // Rotate the internal account's password after consuming this one-time code.
    // Never reset a real-email account: linkedTechnicalAccount verifies the alias.
    const password = generateTemporaryPassword();
    const { error: rotationError } = await account.admin.auth.admin.updateUserById(
      account.userId, { password },
    );
    if (rotationError) return { error: 'No se pudo completar el acceso. Solicita otro código.' };
    const supabase = await createClient();
    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
      email: account.email, password,
    });
    if (loginError || session.user?.id !== account.userId) {
      return { error: 'No se pudo abrir la sesión. Solicita otro código.' };
    }
    return { success: true };
  } catch {
    return { error: 'El acceso no está disponible. Intenta más tarde.' };
  }
}

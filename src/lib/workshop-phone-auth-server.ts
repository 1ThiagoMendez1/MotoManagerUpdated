import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { scheduleAccountAccess } from '@/lib/analytics/web-server';
import { trialWhatsAppPermissions } from '@/lib/subscription-trial';
import { newPhoneCode, newPhonePassword, phoneAuthHash, sendWorkshopPhoneCode } from './workshop-phone-auth';
import type { phoneRequestSchema } from './workshop-phone-shared';
import type { z } from 'zod';

function phoneAuthReady() {
  return !!process.env.WORKSHOP_PHONE_AUTH_TEMPLATE && !!process.env.WHATSAPP_API_TOKEN &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID && (process.env.MOBILE_OTP_PEPPER?.length || 0) >= 32;
}
export const phoneAuthEnabled = () => process.env.WORKSHOP_PHONE_AUTH_ENABLED === 'true' && phoneAuthReady();
export const phoneLoginEnabled = () => process.env.WORKSHOP_PHONE_LOGIN_ENABLED === 'true' && phoneAuthReady();
const secret = () => process.env.MOBILE_OTP_PEPPER || '';
export async function phoneAuthRpc<T = any>(action: string, input: object): Promise<T> {
  const { data, error } = await (createAdminClient() as any).rpc('workshop_phone_auth', { p_action: action, p_input: input });
  if (error) throw new Error('Phone authentication storage unavailable');
  return data as T;
}
export async function requestWorkshopPhone(input: z.infer<typeof phoneRequestSchema>, browser: string, ip: string) {
  const id = randomUUID(), code = newPhoneCode();
  const result = await phoneAuthRpc('request', {
    id, mode: input.mode, phone: input.phone, workshopName: input.workshopName, marketing: input.marketing,
    browserHash: phoneAuthHash('browser', browser, secret()), codeHash: phoneAuthHash('code', id + ':' + code, secret()),
    phoneKey: phoneAuthHash('rate', 'phone:' + input.phone, secret()), ipKey: phoneAuthHash('rate', 'ip:' + ip, secret()),
  });
  if (result.error) return result as { error: string };
  const sent = await sendWorkshopPhoneCode(input.phone, code, {
    token: process.env.WHATSAPP_API_TOKEN || '', phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    template: process.env.WORKSHOP_PHONE_AUTH_TEMPLATE || '', language: process.env.WORKSHOP_PHONE_AUTH_LANGUAGE || 'es_CO',
  });
  await phoneAuthRpc('message', { id, accepted: sent.accepted, failed: !sent.accepted && !sent.ambiguous,
    messageId: sent.accepted ? sent.messageId : null });
  // Ambiguous network results still permit entering the code if it arrives.
  return { challenge: id, delivery: sent.accepted ? 'accepted' : !sent.ambiguous ? 'failed' : 'unknown' };
}

export async function verifyWorkshopPhone(challenge: string, code: string, browser: string) {
  const browserHash = phoneAuthHash('browser', browser, secret()), lease = randomUUID();
  const binding = { id: challenge, browserHash, lease };
  const claim = await phoneAuthRpc('claim', { ...binding, codeHash: phoneAuthHash('code', challenge + ':' + code, secret()) });
  if (claim.error) return claim as { error: string };
  const admin = createAdminClient();
  let finished = false;
  try {
    let { data: account } = await admin.auth.admin.getUserById(claim.userId);
    if (!account?.user && !claim.existing && claim.mode === 'signup') {
      const at = new Date().toISOString();
      const created = await admin.auth.admin.createUser({
        id: claim.userId, phone: claim.phone, phone_confirm: true, password: newPhonePassword(),
        app_metadata: { workshop_phone_auth: true },
        user_metadata: { first_name: 'Administrador', phone: claim.phone, profile_incomplete: true,
          trial_terms_accepted: { at, source: '/prueba-gratis', version: '2026-11-13',
            text: 'Solicito verificar mi número por WhatsApp y activar 15 días de Full gratis, sin cobros automáticos. Autorizo el tratamiento de datos para gestionar mi cuenta.' },
          ...trialWhatsAppPermissions({ welcomeRequested: 'no', marketingRequested: claim.marketing ? 'yes' : 'no' }, at),
        },
      });
      // Lost create responses are recoverable only by the server-reserved ID.
      // Never search for or attach another account that has the same phone.
      account = created.data;
      if (!account?.user) ({ data: account } = await admin.auth.admin.getUserById(claim.userId));
    }
    const user = account?.user;
    if (!user || user.id !== claim.userId || user.phone !== claim.phone || user.email || user.app_metadata?.workshop_phone_auth !== true) return { error: 'legacy' };
    const base = claim.workshopName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'taller';
    const completed = await phoneAuthRpc('complete', { ...binding, slug: base + '-' + randomUUID().slice(0, 8) });
    if (completed.error) return completed as { error: string };
    // Rotate only these explicitly mapped, phone-only identities. Existing
    // email/customer accounts and their passwords are never modified.
    const password = newPhonePassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
    if (updateError) throw new Error('Phone credential unavailable');
    const consumed = await phoneAuthRpc('finish', binding);
    if (!consumed.ok) throw new Error('Code could not be consumed');
    finished = true;
    const session = await createClient();
    const { data, error } = await session.auth.signInWithPassword({ phone: claim.phone, password });
    if (error || data.user?.id !== user.id || !data.session) return { error: 'unavailable' };
    await scheduleAccountAccess(data.user, completed.created ? 'trial_activated' : 'login', completed.organizationId);
    return { redirect: '/' + completed.slug, created: completed.created };
  } finally {
    if (!finished) await phoneAuthRpc('release', binding).catch(() => undefined);
  }
}

/** Delivery receipts only. Called after HMAC verification, never a public patch. */
export async function persistPhoneAuthStatuses(body: any) {
  if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return;
  for (const entry of body.entry) for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
    if (change.field !== 'messages' || change.value?.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
    for (const status of Array.isArray(change.value.statuses) ? change.value.statuses.slice(0, 100) : []) {
      if (typeof status.id !== 'string' || status.id.length > 300 || !['delivered','read','failed'].includes(status.status)) continue;
      await phoneAuthRpc('status', { messageId: status.id, status: status.status });
    }
  }
}

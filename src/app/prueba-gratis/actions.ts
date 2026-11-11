'use server';

import { createHash, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/auth-server';
import { TRIAL_WHATSAPP_CONSENT_TEXT } from '@/lib/subscription-trial';
import { registerTrialAccount, trialAccountFailure, type TrialFormState } from '@/lib/trial-signup';
import { sendWorkshopTrialWelcome } from '@/lib/trial-welcome-server';
import { scheduleAccountAccess, scheduleTrialFailure } from '@/lib/analytics/web-server';
import { analyticsClientIp } from '@/lib/analytics/web-http';

export async function startFullTrial(_previous: TrialFormState, form: FormData): Promise<TrialFormState> {
  // Build request dependencies lazily so validation errors never touch Auth/DB.
  let session: Awaited<ReturnType<typeof createClient>>;
  let admin: Awaited<ReturnType<typeof createAdminClient>>;
  const result = await registerTrialAccount(Object.fromEntries(form), {
    currentUser: async () => {
      session = await createClient();
      const { data, error } = await session.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') throw error;
      return !!data.user;
    },
    claimAttempt: async () => {
      admin = await createAdminClient();
      const requestHeaders = new Headers(await headers());
      // Resolve a trusted Cloudflare client address instead of a shared edge.
      // Missing trusted headers remain in the restricted fallback bucket.
      const address = analyticsClientIp(requestHeaders, process.env.ANALYTICS_CLIENT_IP_HEADER || 'x-real-ip') || 'unknown';
      const key = createHash('sha256').update(`trial:${address}`).digest('hex');
      const { data: allowed, error } = await admin.rpc('claim_trial_signup_attempt', { p_key: key });
      return error ? 'unavailable' : allowed ? 'allowed' : 'limited';
    },
    createAccount: async ({ email, password, fullName, phone, welcomeRequested }) => {
      const acceptedAt = new Date().toISOString();
      const { data, error } = await admin!.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: {
          first_name: fullName.split(' ')[0], last_name: fullName.split(' ').slice(1).join(' '), phone,
          trial_terms_accepted: { at: acceptedAt, source: '/prueba-gratis', version: '2026-11-11',
            text: 'Prueba Full de 15 días por taller, correo y celular, sin cobros automáticos. Autorizo el tratamiento de datos para gestionar la cuenta.' },
          ...(welcomeRequested === 'yes' ? { trial_whatsapp_opt_in: {
            at: acceptedAt, source: '/prueba-gratis', text: TRIAL_WHATSAPP_CONSENT_TEXT,
          } } : {}),
        },
      });
      return { user: error ? null : data.user, errorCode: error ? trialAccountFailure(error) : undefined };
    },
    workshopSlug: name => {
      const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'taller';
      return `${base}-${randomUUID().slice(0, 8)}`;
    },
    provision: async (owner, slug, input) => {
      const { data, error } = await admin!.rpc('provision_workshop_account', {
        p_owner_id: owner, p_name: input.workshopName, p_slug: slug,
        p_phone: input.phone, p_city: input.city, p_is_trial: true,
      });
      if (error) console.warn('[trial] Provision failed:', error.code);
      if (!error && (typeof data !== 'string' || !data)) throw new Error('provision_response_missing');
      return { organizationId: error ? null : data as string, duplicate: error?.code === '23505' };
    },
    removeUnprovisionedAccount: async owner => {
      const { error } = await admin!.auth.admin.deleteUser(owner);
      if (error) throw new Error('cleanup_failed');
    },
  });
  if (!result.ok) {
    await scheduleTrialFailure(result.state.code || 'interrupted');
    return result.state;
  }

  const { user, organizationId, slug } = result;
  await scheduleAccountAccess(user, 'trial_activated', organizationId);
  if (form.get('welcomeRequested') === 'yes') {
    // Delivery never blocks entry, sends a password or cancels activation.
    after(async () => {
      try {
        const welcome = await sendWorkshopTrialWelcome(organizationId, randomUUID(), 'activation', user.id);
        if (!welcome.success) console.warn('[trial-whatsapp] Welcome status:', welcome.status);
      } catch { console.warn('[trial-whatsapp] Welcome could not be processed'); }
    });
  }
  let signedIn = false;
  try {
    const { error } = await session!.auth.signInWithPassword({ email: String(form.get('email') || '').trim().toLowerCase(), password: String(form.get('password') || '') });
    signedIn = !error;
  } catch { /* The account exists: offer login, never a second signup. */ }
  revalidatePath('/', 'layout');
  if (!signedIn) redirect('/login?trial=created');
  redirect(`/${slug}`);
}

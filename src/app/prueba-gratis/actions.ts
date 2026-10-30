'use server';

import { createHash, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/auth-server';
import { getTrialState, trialRegistrationSchema, TRIAL_WHATSAPP_CONSENT_TEXT } from '@/lib/subscription-trial';
import { sendTrialWelcomeViaMeta } from '@/lib/whatsapp-trial';

export async function startFullTrial(_previous: { error: string }, form: FormData): Promise<{ error: string }> {
  const input = trialRegistrationSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0]?.message || 'Revisa los datos del formulario.' };
  const session = await createClient();
  const { data: { user: existing } } = await session.auth.getUser();
  if (existing) return { error: 'Ya tienes una sesión abierta. Cierra sesión para crear una cuenta nueva o entra a tu taller.' };
  const admin = await createAdminClient();
  const requestHeaders = await headers();
  const address = requestHeaders.get('x-real-ip') || requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  // Persisted in PostgreSQL: survives replicas and deploys. Never store the raw IP.
  const key = createHash('sha256').update(`trial:${address}`).digest('hex');
  const { data: allowed, error: rateError } = await admin.rpc('claim_trial_signup_attempt', { p_key: key });
  if (rateError || !allowed) return { error: 'Se alcanzó el límite de intentos. Intenta de nuevo en una hora o inicia sesión si ya tienes cuenta.' };

  const { email, password, fullName, workshopName, phone, city, whatsappConsent } = input.data;
  const optedIn = whatsappConsent === 'on';
  // Same immediate-access model as the existing commercial registration. Never
  // send the chosen password or create a temporary password/payment source.
  const { data: account, error: accountError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {
      first_name: fullName.split(' ')[0], last_name: fullName.split(' ').slice(1).join(' '), phone,
      ...(optedIn ? { trial_whatsapp_opt_in: {
        at: new Date().toISOString(), source: '/prueba-gratis', text: TRIAL_WHATSAPP_CONSENT_TEXT,
      } } : {}),
    },
  });
  if (accountError || !account.user) return { error: 'No pudimos crear la cuenta. Si ese correo ya está registrado, inicia sesión o recupera tu contraseña.' };
  const slugBase = workshopName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'taller';
  const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
  const { data: organizationId, error: provisionError } = await admin.rpc('provision_workshop_account', {
    p_owner_id: account.user.id, p_name: workshopName, p_slug: slug,
    p_phone: phone, p_city: city, p_is_trial: true,
  });
  if (provisionError) {
    // The RPC is atomic: a failed provision never leaves a half-created workshop.
    await admin.auth.admin.deleteUser(account.user.id);
    console.error('[trial] Provision failed:', provisionError.code);
    return { error: provisionError.code === '23505'
      ? 'Este correo o celular ya utilizó una prueba. Ingresa a tu cuenta para continuar con un plan.'
      : 'No pudimos activar tu taller. Intenta de nuevo en unos minutos.' };
  }
  if (optedIn && organizationId) {
    // Run only after a successful account + workshop activation. Delivery must
    // not delay or undo registration, even if Meta is reviewing the template.
    after(async () => {
      try {
        const { data: organization, error } = await admin.from('organizations')
          .select('name,phone,email,settings').eq('id', organizationId).single();
        const settings = organization?.settings || {};
        const trial = getTrialState(settings);
        if (error || !organization || !trial.isTrial || trial.expired || organization.email !== email) {
          console.warn('[trial-whatsapp] Activation could not be verified');
          return;
        }
        const result = await sendTrialWelcomeViaMeta({
          phone: organization.phone || phone, fullName, workshopName: organization.name,
          email, startsAt: settings.trialStartDate, endsAt: settings.trialEndDate, optedIn,
        }, {
          token: process.env.WHATSAPP_API_TOKEN, phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          version: process.env.WHATSAPP_GRAPH_API_VERSION,
        });
        if (result.status !== 'accepted') console.warn('[trial-whatsapp] Welcome not confirmed', result);
      } catch {
        // Keep errors and logs free of registration data, passwords and tokens.
        console.warn('[trial-whatsapp] Welcome could not be processed');
      }
    });
  }
  const { error: loginError } = await session.auth.signInWithPassword({ email, password });
  revalidatePath('/', 'layout');
  if (loginError) redirect('/login?trial=created');
  redirect(`/${slug}`);
}

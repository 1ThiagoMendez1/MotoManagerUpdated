import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/managed-client';
import { getTrialState } from '@/lib/subscription-trial';
import { sendTrialWelcomeViaMeta } from '@/lib/whatsapp-trial';
import { deliverTrialWelcome, lastTrialWelcome, validWelcomeRequestId, type WelcomeDeliveryDependencies } from '@/lib/trial-welcome-delivery';

const normalizePhone = (value: unknown) => {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  return digits.length === 10 ? '57' + digits : digits;
};
const database = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });

function dependencies(db: SupabaseClient, workshopId: string): WelcomeDeliveryDependencies {
  return {
    load: async () => {
      const [{ data: org, error: orgError }, { data: owners, error: ownerError }] = await Promise.all([
        db.from('organizations').select('id,name,email,phone,settings').eq('id', workshopId).single(),
        db.from('organization_members').select('user_id').eq('organization_id', workshopId).eq('role', 'owner').eq('status', 'active').limit(2),
      ]);
      if (orgError || ownerError || !org || owners?.length !== 1) return { error: 'No pudimos verificar el taller y su propietario activo.' };
      const { data, error } = await db.auth.admin.getUserById(owners[0].user_id);
      const user = data?.user;
      if (error || !user || !user.email) return { error: 'No pudimos verificar la cuenta del propietario.' };
      const phone = normalizePhone(org.phone);
      const permission = user.user_metadata?.trial_whatsapp_opt_in;
      if (!/^[0-9]{10,15}$/.test(phone) || phone !== normalizePhone(user.user_metadata?.phone) ||
        String(org.email || '').toLowerCase() !== user.email.toLowerCase())
        return { error: 'Los datos del propietario cambiaron. Revisa el correo y el WhatsApp del taller antes de reenviar.' };
      const settings = org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings) ? org.settings : {};
      return { target: {
        settings,
        input: {
          phone,
          fullName: [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(v => typeof v === 'string').join(' ').trim() || 'Bienvenido',
          workshopName: org.name, email: user.email,
          startsAt: settings.trialStartDate, endsAt: settings.trialEndDate,
          optedIn: permission?.source === '/prueba-gratis' && typeof permission?.at === 'string' && Number.isFinite(Date.parse(permission.at)),
        },
      } };
    },
    compareAndSet: async (expected, updated) => {
      const { data, error } = await db.from('organizations').update({ settings: updated })
        .eq('id', workshopId).eq('settings', JSON.stringify(expected)).select('id').maybeSingle();
      if (error) throw new Error('Welcome state unavailable');
      return !!data;
    },
    send: input => sendTrialWelcomeViaMeta(input, {
      token: process.env.WHATSAPP_API_TOKEN, phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      version: process.env.WHATSAPP_GRAPH_API_VERSION,
      variableCount: Number(process.env.WHATSAPP_TRIAL_WELCOME_VAR_COUNT || '5'),
    }),
  };
}
export async function previewTrialWelcome(workshopId: string) {
  if (!validWelcomeRequestId(workshopId)) return { success: false as const, error: 'El taller no es válido.' };
  const loaded = await dependencies(database(), workshopId).load();
  if ('error' in loaded) return { success: false as const, error: loaded.error };
  const { settings, input } = loaded.target;
  const trial = getTrialState(settings);
  if (trial.paused) return { success: false as const, error: 'La prueba está pausada mientras verificamos los datos del taller.' };
  if (!trial.isTrial || trial.expired) return { success: false as const, error: 'Este taller no tiene una prueba gratuita vigente.' };
  if (typeof input.startsAt !== 'string' || !Number.isFinite(Date.parse(input.startsAt)) || Date.parse(input.startsAt) > Date.now())
    return { success: false as const, error: 'Las fechas de la prueba no son válidas.' };
  if (!input.optedIn) return { success: false as const, error: 'No hay una solicitud de bienvenida por WhatsApp registrada. Solicita al propietario que la autorice antes de enviarla.' };
  if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID)
    return { success: false as const, error: 'Falta configurar el emisor de WhatsApp de MotoManager.' };
  const previous = lastTrialWelcome(settings);
  return { success: true as const, workshopName: input.workshopName, phone: '+' + input.phone,
    startsAt: input.startsAt, endsAt: input.endsAt, lastStatus: previous?.status || null,
    lastAttemptAt: previous?.startedAt || null };
}
export async function sendWorkshopTrialWelcome(workshopId: string, requestId: string, source: 'activation' | 'admin', actorId: string) {
  if (!validWelcomeRequestId(workshopId)) return { success: false, status: 'blocked' as const, message: 'El taller no es válido.' };
  return deliverTrialWelcome(requestId, source, actorId, dependencies(database(), workshopId));
}

import { z } from 'zod';

export const TRIAL_DAYS = 15;
export const TRIAL_WHATSAPP_CONSENT_TEXT = 'Al crear mi taller, solicito un mensaje de WhatsApp de MotoManager con los datos de mi prueba gratis y el enlace de acceso. Las promociones requieren mi elección opcional por separado.';
export const TRIAL_WHATSAPP_MARKETING_TEXT = 'Quiero recibir consejos, novedades y promociones de MotoManager por WhatsApp. Es opcional y puedo pedir que dejen de enviármelos respondiendo al mensaje.';
export function trialWhatsAppPermissions(input: { welcomeRequested: 'yes' | 'no'; marketingRequested: 'yes' | 'no' }, at: string) {
  const source = '/prueba-gratis', version = '2026-11-12';
  return {
    ...(input.welcomeRequested === 'yes' ? { trial_whatsapp_opt_in: { at, source, version, text: TRIAL_WHATSAPP_CONSENT_TEXT } } : {}),
    trial_whatsapp_marketing_consent: { granted: input.marketingRequested === 'yes', at, source, version, text: TRIAL_WHATSAPP_MARKETING_TEXT },
  };
}
export const trialRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe tu nombre completo.').max(120),
  workshopName: z.string().trim().min(3, 'El nombre del taller debe tener al menos 3 caracteres.').max(120),
  email: z.string().trim().toLowerCase().email('Revisa tu correo electrónico.').max(254),
  phone: z.string().transform(value => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `57${digits}` : digits;
  }).pipe(z.string().regex(/^\d{10,15}$/, 'Escribe un celular válido, con indicativo si estás fuera de Colombia.')),
  // Location is completed in the workshop profile; it is not needed to open it.
  city: z.string().trim().max(120).optional().default(''),
  password: z.string().min(10, 'Usa una contraseña de al menos 10 caracteres.').max(128),
  // Affirmative final submit after a short, visible statement; no opt-in checkboxes.
  termsAcknowledged: z.literal('yes', { errorMap: () => ({ message: 'Confirma las condiciones al activar tu cuenta.' }) }),
  welcomeRequested: z.enum(['yes', 'no']),
  marketingRequested: z.enum(['yes', 'no']).optional().default('no'),
  website: z.string().max(0).optional(),
});

export function getTrialState(settings: Record<string, any> | null | undefined, now = Date.now()) {
  const isTrial = settings?.isTrial === true;
  const endsAt = isTrial ? settings?.trialEndDate : null;
  const end = typeof endsAt === 'string' ? Date.parse(endsAt) : NaN;
  const paused = settings?.trialReviewPaused === true;
  const expired = isTrial && !paused && (!Number.isFinite(end) || end <= now);
  return { isTrial, paused, expired, endsAt, daysRemaining: isTrial && !expired && !paused ? Math.ceil((end - now) / 86_400_000) : 0 };
}

export function subscriptionCycle(cycle: string) {
  if (cycle === 'biannual') return { months: 6, discount: 0.9 };
  if (cycle === 'yearly') return { months: 12, discount: 0.8 };
  return { months: 1, discount: 1 };
}

export function subscriptionPrice(price: number, cycle: string) {
  const { months, discount } = subscriptionCycle(cycle);
  return Math.round(price * months * discount);
}

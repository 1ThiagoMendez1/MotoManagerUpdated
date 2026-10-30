import { z } from 'zod';

export const TRIAL_DAYS = 15;
export const trialRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Escribe tu nombre completo.').max(120),
  workshopName: z.string().trim().min(3, 'El nombre del taller debe tener al menos 3 caracteres.').max(120),
  email: z.string().trim().toLowerCase().email('Revisa tu correo electrónico.').max(254),
  phone: z.string().transform(value => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `57${digits}` : digits;
  }).pipe(z.string().regex(/^\d{10,15}$/, 'Escribe un celular válido, con indicativo si estás fuera de Colombia.')),
  city: z.string().trim().min(2, 'Escribe la ciudad de tu taller.').max(120),
  password: z.string().min(10, 'Usa una contraseña de al menos 10 caracteres.').max(128),
  terms: z.literal('on', { errorMap: () => ({ message: 'Acepta las condiciones de la prueba.' }) }),
  website: z.string().max(0).optional(),
});

export function getTrialState(settings: Record<string, any> | null | undefined, now = Date.now()) {
  const isTrial = settings?.isTrial === true;
  const endsAt = isTrial ? settings?.trialEndDate : null;
  const end = typeof endsAt === 'string' ? Date.parse(endsAt) : NaN;
  const expired = isTrial && (!Number.isFinite(end) || end <= now);
  return { isTrial, expired, endsAt, daysRemaining: isTrial && !expired ? Math.ceil((end - now) / 86_400_000) : 0 };
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

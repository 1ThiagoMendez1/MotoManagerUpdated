import { z } from 'zod';

export const PHONE_AUTH_CAMPAIGN = 'trial-v3-phone-v1';
export const PHONE_AUTH_COOKIE = 'mm-workshop-phone';
export const PHONE_AUTH_TTL = 300;
export const PHONE_AUTH_COOLDOWN = 60;

export function normalizeWorkshopPhone(value: string) {
  if (!/^[+\d\s().-]+$/.test(value)) return '';
  const digits = value.replace(/\D/g, '');
  const phone = digits.length === 10 ? '57' + digits : digits;
  return /^[1-9]\d{9,14}$/.test(phone) ? phone : '';
}
export const phoneRequestSchema = z.object({
  action: z.literal('request'), mode: z.enum(['signup', 'login']),
  phone: z.string().max(30).transform(normalizeWorkshopPhone).pipe(z.string().min(10, 'Revisa tu número de WhatsApp.')),
  workshopName: z.string().trim().max(120).optional().default(''),
  marketing: z.boolean().optional().default(false),
  terms: z.literal(true), website: z.string().max(0).optional(),
}).strict().refine(value => value.mode !== 'signup' || value.workshopName.length >= 3, { path: ['workshopName'], message: 'Escribe el nombre de tu taller (mínimo 3 caracteres).' });
export const phoneVerifySchema = z.object({
  action: z.literal('verify'), challenge: z.string().uuid(), code: z.string().regex(/^\d{6}$/),
}).strict();

export const PHONE_AUTH_ERRORS: Record<string, string> = {
  invalid: 'El código no es correcto o ya venció. Revisa los seis dígitos del último mensaje.',
  expired: 'El código venció. Solicita uno nuevo para continuar.',
  limited: 'Espera un momento antes de pedir otro código. Conservamos los datos que escribiste.',
  processing: 'Estamos terminando tu acceso. Espera unos segundos y vuelve a continuar.',
  legacy: 'Este número ya está vinculado a una cuenta anterior. Entra con tu correo y contraseña; ese acceso sigue funcionando.',
  no_account: 'Este número todavía no tiene un taller con acceso por WhatsApp. Puedes crear tu prueba gratuita.',
  delivery: 'No pudimos confirmar el envío por WhatsApp. Revisa el número y vuelve a pedir el código en un minuto.',
  unavailable: 'No pudimos completar el acceso en este momento. Tus datos siguen aquí; inténtalo de nuevo.',
  session: 'Ya tienes una sesión abierta. Continúa desde tu taller.',
};

import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { trialRegistrationSchema } from './subscription-trial';

export const TRIAL_FIELDS = ['workshopName', 'fullName', 'phone', 'email', 'password'] as const;
export type TrialField = typeof TRIAL_FIELDS[number];
export const TRIAL_STEPS: readonly (readonly TrialField[])[] = [['workshopName', 'fullName'], ['phone', 'email', 'password']];
export const TRIAL_ERROR_LABELS = {
  validation: 'Datos por corregir', session_open: 'Sesión ya abierta', rate_limited: 'Límite de intentos',
  rate_unavailable: 'Verificación de intentos no disponible', account_exists: 'Cuenta ya registrada',
  account_failed: 'No se pudo crear la cuenta', trial_used: 'Celular o taller con prueba previa',
  provision_failed: 'No se pudo crear el taller', interrupted: 'Conexión interrumpida',
  connection: 'Error de conexión en el navegador',
} as const;
export type TrialErrorCode = keyof typeof TRIAL_ERROR_LABELS;
export type TrialFormState = { error: string; code?: TrialErrorCode; fieldErrors?: Partial<Record<TrialField, string>> };
export type TrialInput = z.infer<typeof trialRegistrationSchema>;

export function trialFieldErrors(issues: z.ZodIssue[]) {
  const errors: Partial<Record<TrialField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as TrialField;
    if (TRIAL_FIELDS.includes(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function validateTrialStep(data: Record<TrialField, string>, step: number) {
  const result = trialRegistrationSchema.safeParse({ ...data, termsAcknowledged: 'yes', welcomeRequested: 'yes' });
  if (result.success) return {};
  const errors = trialFieldErrors(result.error.issues);
  return Object.fromEntries(Object.entries(errors).filter(([key]) => TRIAL_STEPS[step]?.includes(key as TrialField))) as Partial<Record<TrialField, string>>;
}

export function trialAccountFailure(error: { code?: string; status?: number } | null | undefined) {
  // Never expose provider messages, submitted addresses or database details.
  return ['email_exists', 'user_already_exists'].includes(error?.code || '') || error?.status === 409
    ? 'account_exists' as const : 'account_failed' as const;
}

export type TrialSignupDependencies = {
  currentUser: () => Promise<boolean>;
  claimAttempt: () => Promise<'allowed' | 'limited' | 'unavailable'>;
  createAccount: (input: TrialInput) => Promise<{ user: User | null; errorCode?: TrialErrorCode }>;
  workshopSlug: (name: string) => string;
  provision: (owner: string, slug: string, input: TrialInput) => Promise<{ organizationId: string | null; duplicate?: boolean }>;
  removeUnprovisionedAccount: (owner: string) => Promise<void>;
};

const messages: Record<TrialErrorCode, string> = {
  validation: 'Revisa los datos marcados. Lo que escribiste sigue aquí.',
  session_open: 'Ya tienes una sesión abierta. Entra a tu taller o cierra esa sesión antes de crear otro.',
  rate_limited: 'Alcanzaste el límite de intentos. Puedes iniciar sesión si ya creaste tu cuenta, o volver a intentarlo en una hora.',
  rate_unavailable: 'No pudimos comprobar el registro en este momento. Tus datos siguen aquí; vuelve a intentarlo en unos minutos.',
  account_exists: 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña para entrar a tu taller.',
  account_failed: 'No pudimos crear tu cuenta. Revisa el correo y la contraseña, o vuelve a intentarlo en unos minutos.',
  trial_used: 'Este celular o taller ya utilizó una prueba. Inicia sesión para continuar con tu cuenta o elegir un plan.',
  provision_failed: 'No pudimos activar tu taller. Tus datos siguen aquí; vuelve a intentarlo en unos minutos.',
  interrupted: 'Se interrumpió la conexión al activar tu taller. Si la cuenta alcanzó a crearse, entra con tu correo y contraseña. Tus datos siguen aquí.',
  connection: 'No recibimos respuesta. Revisa tu conexión. Si tu cuenta ya se creó, puedes iniciar sesión con los mismos datos.',
};
export const trialFailure = (code: TrialErrorCode): TrialFormState => ({ error: messages[code], code });

/** Tested signup sequence; no passwords, input values or provider messages are logged. */
export async function registerTrialAccount(raw: Record<string, unknown>, deps: TrialSignupDependencies) {
  const parsed = trialRegistrationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, state: { ...trialFailure('validation'), fieldErrors: trialFieldErrors(parsed.error.issues) } };
  const input = parsed.data;
  try {
    if (await deps.currentUser()) return { ok: false as const, state: trialFailure('session_open') };
    const claim = await deps.claimAttempt();
    if (claim !== 'allowed') return { ok: false as const, state: trialFailure(claim === 'limited' ? 'rate_limited' : 'rate_unavailable') };
    const account = await deps.createAccount(input);
    if (!account.user) return { ok: false as const, state: trialFailure(account.errorCode || 'account_failed') };
    const slug = deps.workshopSlug(input.workshopName);
    const provision = await deps.provision(account.user.id, slug, input);
    if (!provision.organizationId) {
      // Cleanup is safe only after an explicit, atomic RPC failure. A lost
      // response might mean provision succeeded, so the catch never deletes.
      await deps.removeUnprovisionedAccount(account.user.id);
      return { ok: false as const, state: trialFailure(provision.duplicate ? 'trial_used' : 'provision_failed') };
    }
    return { ok: true as const, user: account.user, slug, organizationId: provision.organizationId };
  } catch {
    return { ok: false as const, state: trialFailure('interrupted') };
  }
}

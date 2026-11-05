import { getTrialState } from './subscription-trial';
import type { TrialWelcomeInput, TrialWelcomeResult } from './whatsapp-trial';

export const TRIAL_WELCOME_DELIVERY_KEY = 'trialWelcomeDelivery';
export type WelcomeDeliveryStatus = 'sending' | 'accepted' | 'rejected' | 'unconfirmed' | 'skipped';
export type WelcomeAttempt = {
  requestId: string;
  status: WelcomeDeliveryStatus;
  startedAt: string;
  completedAt?: string;
  source: 'activation' | 'admin';
  actorId: string;
  messageId?: string;
  metaCode?: number;
  httpStatus?: number;
};
export type WelcomeDeliveryResult = {
  success: boolean;
  status: WelcomeDeliveryStatus | 'blocked';
  message: string;
  recorded?: boolean;
};
export type WelcomeTarget = { settings: Record<string, unknown>; input: TrialWelcomeInput };
export type WelcomeDeliveryDependencies = {
  load: () => Promise<{ target: WelcomeTarget } | { error: string }>;
  compareAndSet: (expected: Record<string, unknown>, updated: Record<string, unknown>) => Promise<boolean>;
  send: (input: TrialWelcomeInput) => Promise<TrialWelcomeResult>;
  now?: () => number;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validWelcomeRequestId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);

export function lastTrialWelcome(settings: Record<string, unknown>): WelcomeAttempt | null {
  const value = settings[TRIAL_WELCOME_DELIVERY_KEY] as Partial<WelcomeAttempt> | undefined;
  if (!value || !validWelcomeRequestId(value.requestId) ||
    !['sending', 'accepted', 'rejected', 'unconfirmed', 'skipped'].includes(value.status || '') ||
    typeof value.startedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt))) return null;
  return value as WelcomeAttempt;
}
function resultFor(attempt: WelcomeAttempt, recorded = true): WelcomeDeliveryResult {
  if (attempt.status === 'accepted') return {
    success: true, status: 'accepted', recorded,
    message: 'Meta aceptó la bienvenida. La aceptación no confirma que WhatsApp ya la haya entregado.',
  };
  if (attempt.status === 'rejected') return {
    success: false, status: 'rejected', recorded,
    message: 'Meta rechazó el envío' + (attempt.metaCode ? ' (código ' + attempt.metaCode + ')' : '') + '. Revisa la plantilla y el número emisor.',
  };
  if (attempt.status === 'sending') return { success: false, status: 'blocked', message: 'Ya hay un envío en proceso para este taller. Espera antes de volver a intentarlo.' };
  if (attempt.status === 'skipped') return { success: false, status: 'skipped', recorded, message: 'El envío no se realizó. Revisa la configuración de WhatsApp y la solicitud del propietario.' };
  return { success: false, status: 'unconfirmed', recorded, message: 'No pudimos confirmar la respuesta de Meta. Verifica si el mensaje llegó antes de reenviarlo para evitar un duplicado.' };
}
const blocked = (message: string): WelcomeDeliveryResult => ({ success: false, status: 'blocked', message });

/** Shared by activation and an explicit administrator resend.
 * Compare the entire settings document before every write: a concurrent plan,
 * quota or schedule update must never be overwritten. No passwords are changed.
 * A transport timeout is recorded, never automatically replayed. */
export async function deliverTrialWelcome(
  requestId: string,
  source: 'activation' | 'admin',
  actorId: string,
  deps: WelcomeDeliveryDependencies,
): Promise<WelcomeDeliveryResult> {
  if (!validWelcomeRequestId(requestId) || !validWelcomeRequestId(actorId)) return blocked('La solicitud de envío no es válida.');
  const now = deps.now || Date.now;
  for (let retry = 0; retry < 4; retry++) {
    const loaded = await deps.load();
    if ('error' in loaded) return blocked(loaded.error);
    const { settings, input } = loaded.target;
    const trial = getTrialState(settings, now());
    if (!trial.isTrial || trial.expired) return blocked('El taller no tiene una prueba gratuita vigente. No se modificaron sus fechas.');
    if (!input.optedIn) return blocked('No hay una solicitud de bienvenida por WhatsApp registrada para este propietario.');
    if (!Number.isFinite(Date.parse(input.startsAt)) || Date.parse(input.startsAt) > now()) return blocked('Las fechas de la prueba no son válidas.');
    const previous = lastTrialWelcome(settings);
    if (previous?.requestId === requestId) return resultFor(previous);
    if (source === 'activation' && previous) return resultFor(previous);
    if (previous?.status === 'sending' && now() - Date.parse(previous.startedAt) < 90_000) return resultFor(previous);
    if (source === 'admin' && now() - Date.parse(previous?.startedAt || input.startsAt) < 60_000)
      return blocked('Espera un minuto entre envíos de bienvenida para este taller.');
    const attempt: WelcomeAttempt = {
      requestId, status: 'sending', startedAt: new Date(now()).toISOString(), source, actorId,
    };
    if (!await deps.compareAndSet(settings, { ...settings, [TRIAL_WELCOME_DELIVERY_KEY]: attempt })) continue;

    let response: TrialWelcomeResult;
    try { response = await deps.send(input); }
    catch { response = { status: 'unconfirmed', reason: 'transport_error' }; }
    const definitiveRejection = response.status !== 'accepted' && response.reason === 'provider_rejected' &&
      !!response.httpStatus && response.httpStatus >= 400 && response.httpStatus < 500;
    const completed: WelcomeAttempt = {
      ...attempt,
      status: response.status === 'accepted' ? 'accepted' : definitiveRejection ? 'rejected' : response.status,
      completedAt: new Date(now()).toISOString(),
      ...(response.status === 'accepted'
        ? { messageId: response.messageId.slice(0, 2048) }
        : { ...(response.metaCode !== undefined ? { metaCode: response.metaCode } : {}),
            ...(response.httpStatus !== undefined ? { httpStatus: response.httpStatus } : {}) }),
    };
    // Once a POST might have reached Meta, a database error cannot trigger it again.
    for (let save = 0; save < 4; save++) {
      try {
        const fresh = await deps.load();
        if ('error' in fresh || lastTrialWelcome(fresh.target.settings)?.requestId !== requestId) break;
        if (await deps.compareAndSet(fresh.target.settings, { ...fresh.target.settings, [TRIAL_WELCOME_DELIVERY_KEY]: completed }))
          return resultFor(completed);
      } catch { break; }
    }
    return resultFor(completed, false);
  }
  return blocked('El taller se está actualizando. Intenta el reenvío de nuevo en unos segundos.');
}

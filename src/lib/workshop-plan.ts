import { getPlanLimits } from './constants/plans';
import { getTrialState } from './subscription-trial';

/** Plan de producto vigente. El ciclo de cobro no es un plan. */
export type WorkshopPlan = 'basic' | 'pro' | 'full';

function normalizePlan(value: unknown): WorkshopPlan | null {
  if (value === 'basic' || value === 'pro' || value === 'full') return value;
  // Registros anteriores confundían periodicidad o demo con el plan.
  if (value === 'monthly' || value === 'biannual' || value === 'yearly' || value === 'demo') {
    return 'basic';
  }
  return null;
}

/**
 * El alta y los cobros guardan settings.plan. settings.sub_plan se usó en un
 * control antiguo de cuota, pero no es la fuente principal de la suscripción.
 * Priorizar plan también permite que un downgrade no mantenga una cuota Full
 * obsoleta en sub_plan.
 */
export function resolveWorkshopPlan(settings: unknown): WorkshopPlan {
  let value = settings;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return 'basic';
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'basic';
  const record = value as Record<string, unknown>;
  return normalizePlan(record.plan) ?? normalizePlan(record.sub_plan) ?? 'basic';
}

export function getWorkshopWhatsAppLimit(settings: unknown): number {
  // Cron jobs also use this resolver with a service client. An expired free
  // account must not keep sending reminders outside the interactive UI.
  if (settings && typeof settings === 'object' && !Array.isArray(settings) &&
      getTrialState(settings as Record<string, unknown>).expired) return 0;
  return getPlanLimits(resolveWorkshopPlan(settings)).whatsapp_limit;
}

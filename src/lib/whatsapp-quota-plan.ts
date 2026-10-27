/**
 * Quota must read the SAME canonical subscription field as the billing UI.
 *
 * Historically WhatsApp read settings.sub_plan while the subscription editor
 * writes settings.plan. This silently downgraded Full/Pro to Basic in WhatsApp.
 */
export type WorkshopWhatsAppPlan = 'basic' | 'pro' | 'full';

function normalizePlan(value: unknown): WorkshopWhatsAppPlan | null {
  if (typeof value !== 'string') return null;
  const plan = value.trim().toLowerCase();
  if (plan === 'basic' || plan === 'pro' || plan === 'full') return plan;
  if (plan === 'monthly') return 'basic'; // Legacy billing-cycle alias.
  return null;
}

export function resolveWorkshopWhatsAppPlan(settings: unknown): WorkshopWhatsAppPlan {
  let value: unknown = settings;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return 'basic'; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'basic';
  const obj = value as { plan?: unknown; sub_plan?: unknown };

  // Canonical subscription setting wins over a stale, conflicting legacy key.
  return normalizePlan(obj.plan) ?? normalizePlan(obj.sub_plan) ?? 'basic';
}

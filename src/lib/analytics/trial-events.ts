import { TRIAL_ERROR_LABELS, type TrialErrorCode } from '../trial-signup';
import { validTrialFieldTarget, type TrialFieldTarget } from './trial-fields';

export const TRIAL_DIAGNOSTIC_EVENT = 'mm:trial-progress';
export type TrialDiagnosticEvent = { kind: 'form_step'; target: 'access' | TrialFieldTarget | `field_v2:${'workshop'|'phone'|'code'}:${'view'|'edit'|'valid'|'invalid'}` | `phone_v1:${'request'|'accepted'|'verify'|'verified'}` } |
  { kind: 'form_submit'; target: 'activate' } | { kind: 'form_error'; target: TrialErrorCode };
export function validTrialDiagnostic(value: unknown): value is TrialDiagnosticEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  if (Object.keys(event).some(key => !['kind', 'target'].includes(key))) return false;
  return event.kind === 'form_step' && (event.target === 'access' || validTrialFieldTarget(event.target) || typeof event.target === 'string' && /^(field_v2:(workshop|phone|code):(view|edit|valid|invalid)|phone_v1:(request|accepted|verify|verified))$/.test(event.target)) ||
    event.kind === 'form_submit' && event.target === 'activate' ||
    event.kind === 'form_error' && typeof event.target === 'string' && Object.hasOwn(TRIAL_ERROR_LABELS, event.target);
}
/** Only allowlisted milestones. Never accepts field contents or error messages. */
export function emitTrialDiagnostic(event: TrialDiagnosticEvent) {
  if (typeof window !== 'undefined' && validTrialDiagnostic(event)) window.dispatchEvent(new CustomEvent(TRIAL_DIAGNOSTIC_EVENT, { detail: event }));
}

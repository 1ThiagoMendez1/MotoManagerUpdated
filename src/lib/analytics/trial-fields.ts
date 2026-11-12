import type { TrialField } from '../trial-signup';

export const TRIAL_FIELD_CAMPAIGN = 'trial-v2-fields-v1';
export const TRIAL_PROGRESS_FIELDS = [
  { name: 'workshopName', key: 'workshop', label: 'Nombre del taller' },
  { name: 'fullName', key: 'name', label: 'Nombre del responsable' },
  { name: 'email', key: 'email', label: 'Correo de acceso' },
  { name: 'password', key: 'password', label: 'Contraseña' },
  { name: 'phone', key: 'phone', label: 'WhatsApp' },
] as const;
export type TrialProgressField = typeof TRIAL_PROGRESS_FIELDS[number]['key'];
export type TrialFieldStage = 'view' | 'edit' | 'valid' | 'invalid';
export type TrialFieldTarget = `field_v1:${TrialProgressField}:${TrialFieldStage}`;

export function trialFieldTarget(field: TrialField, stage: TrialFieldStage): TrialFieldTarget {
  return `field_v1:${TRIAL_PROGRESS_FIELDS.find(row => row.name === field)!.key}:${stage}`;
}
export function validTrialFieldTarget(value: unknown): value is TrialFieldTarget {
  return typeof value === 'string' && /^field_v1:(workshop|name|email|password|phone):(view|edit|valid|invalid)$/.test(value);
}

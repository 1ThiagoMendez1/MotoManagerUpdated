/** Available statuses for NEW state changes. Legacy states remain in history. */
export const WORK_ORDER_STATUS_OPTIONS = [
  'Diagnosticando',
  'Reparado',
  'Entregado',
  'Moto entregada por cotización rechazada',
] as const;
export type ChangeableWorkOrderStatus = typeof WORK_ORDER_STATUS_OPTIONS[number];
export function isChangeableOrderStatus(value: unknown): value is ChangeableWorkOrderStatus {
  return typeof value === 'string' && WORK_ORDER_STATUS_OPTIONS.some(item => item === value);
}

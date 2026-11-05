export const STATUS_TEMPLATE_NAME = 'actualizacion_estado_moto';

/** Parameter order must match the approved Meta Utility template's five body variables. */
export function statusTemplateParameters(values: {
  customerName: string; workshopName: string; motorcycleInfo: string;
  orderNumber: string; status: string;
}): string[] {
  return [values.customerName, values.workshopName, values.motorcycleInfo,
    values.orderNumber, values.status]
    .map(value => String(value || 'No especificado').replace(/\s+/g, ' ').trim().slice(0, 300));
}

import { formatBusinessHours } from './business-hours';

/**
 * The legacy ready-for-pickup template includes a fixed, wrong opening
 * schedule. Never select it, including through an outdated environment value.
 * A provider-specific name is permitted only if it is syntactically valid.
 */
export function readyDynamicTemplateName(configured: string | undefined): string | null {
  const name = configured === undefined ? 'diagnosticado_reparado_horarios' : configured.trim();
  if (!/^[a-z][a-z0-9_]{0,511}$/.test(name) ||
      name === 'diagnosticado_reparado') return null;
  return name;
}


export type ReadyNotice = {
  customerName: string;
  workshopName: string;
  motorcycleInfo: string;
  plate: string;
  orderNumber: string;
  workshopAddress: string;
  businessHours: unknown;
};

export function composeReadyNotice(data: ReadyNotice): string {
  const name = data.workshopName.trim() || 'el taller';
  const address = data.workshopAddress.trim() || 'Solicita la dirección directamente al taller';
  return [
    'Hola, ' + data.customerName.trim() + '. 👋',
    '',
    '📣 En *' + name + '* te informamos que el servicio de tu motocicleta ha finalizado y ya está lista para ser entregada.',
    '',
    '📋 *Información del vehículo*',
    '🏍️ Motocicleta: ' + data.motorcycleInfo,
    '🪪 Placa: ' + data.plate,
    '📄 Número de orden: ' + data.orderNumber,
    '📍 Dirección: ' + address,
    '',
    '📅 Te invitamos a acercarte al taller en el horario de atención:',
    '⏰ ' + formatBusinessHours(data.businessHours),
    '',
    '💭 Si tienes alguna duda, estaremos encantados de atenderte.',
    '',
    '¡Gracias por confiar en *' + name + '*! 🏍️',
  ].join('\n');
}

/**
 * Parámetros EXCLUSIVOS de la plantilla Meta diagnosticado_reparado_horarios:
 * {{1}} nombre, {{2}} taller, {{3}} moto, {{4}} placa,
 * {{5}} orden, {{6}} dirección, {{7}} horario completo, {{8}} taller.
 * La plantilla antigua NO es compatible: contiene horarios literales.
 */
export function readyNoticeTemplateParameters(data: ReadyNotice): string[] {
  return [
    data.customerName.trim(),
    data.workshopName.trim(),
    data.motorcycleInfo.trim(),
    data.plate.trim(),
    data.orderNumber.trim(),
    data.workshopAddress.trim() || 'Consulta la dirección con el taller',
    formatBusinessHours(data.businessHours),
    data.workshopName.trim(),
  ];
}

/** Actual Meta template: header has 1 parameter, body has 7 (Spanish COL).
 * Header: "Actualización de estado - {{1}}" with value "Diagnosticando".
 * Body: client, workshop, motorcycle, plate, order, address, workshop.
 * Footer and Más información button are configured as static in Meta.
 */
export const DIAGNOSIS_TEMPLATE_NAME = 'actualizacion_estado_diagnosticando';
export type DiagnosisNotice = {
  customerName: string;
  workshopName: string;
  motorcycleInfo: string;
  plate: string;
  orderNumber: string;
  workshopAddress: string;
};
function clean(value: string, fallback: string): string {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, 300) || fallback;
}
export function buildDiagnosisMetaTemplate(data: DiagnosisNotice) {
  const body = [
    clean(data.customerName, 'Cliente'),
    clean(data.workshopName, 'el taller'),
    clean(data.motorcycleInfo, 'Motocicleta'),
    clean(data.plate, 'Sin placa'),
    clean(data.orderNumber, 'Sin número'),
    clean(data.workshopAddress, 'Consulta la dirección con el taller'),
    clean(data.workshopName, 'el taller'),
  ];
  return {
    name: DIAGNOSIS_TEMPLATE_NAME,
    language: { code: 'es_CO' as const },
    components: [
      { type: 'header' as const, parameters: [{ type: 'text' as const, text: 'Diagnosticando' }] },
      { type: 'body' as const, parameters: body.map(text => ({ type: 'text' as const, text })) },
    ],
  };
}

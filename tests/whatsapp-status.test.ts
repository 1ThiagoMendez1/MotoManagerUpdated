import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusTemplateParameters, STATUS_TEMPLATE_NAME } from '../src/lib/whatsapp-status';

test('all workflow status values fit one approved five-variable utility template', () => {
  assert.equal(STATUS_TEMPLATE_NAME, 'actualizacion_estado_moto');
  for (const status of ['Ingreso a revisión', 'Diagnosticando', 'En proceso',
    'Entregado', 'Moto entregada por cotización rechazada']) {
    const params = statusTemplateParameters({
      customerName: 'Ana\n María', workshopName: 'FrankorMotos',
      motorcycleInfo: 'Yamaha FZ (ABC12D)', orderNumber: '123', status,
    });
    assert.deepEqual(params, ['Ana María','FrankorMotos','Yamaha FZ (ABC12D)','123',status]);
    assert.ok(params.every(value => !/[\r\n\t]| {5,}/.test(value)));
  }
});

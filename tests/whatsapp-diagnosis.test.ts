import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosisMetaTemplate, DIAGNOSIS_TEMPLATE_NAME } from '../src/lib/whatsapp-diagnosis';
import { WORK_ORDER_STATUS_OPTIONS, isChangeableOrderStatus, NEW_WORK_ORDER_DB_STATUS } from '../src/lib/work-order-status';

test('solo cuatro estados visibles, excluye estados obsoletos y entradas forzadas', () => {
  assert.deepEqual(WORK_ORDER_STATUS_OPTIONS, [
    'Diagnosticando', 'Reparado', 'Entregado', 'Moto entregada por cotización rechazada',
  ]);
  assert.equal(isChangeableOrderStatus('Diagnosticando'), true);
  assert.equal(isChangeableOrderStatus('En proceso'), false);
  assert.equal(isChangeableOrderStatus('Ingreso a revisión'), false);
  assert.equal(isChangeableOrderStatus('draft'), false);
  assert.equal(isChangeableOrderStatus(''), false);
  assert.equal(isChangeableOrderStatus(null), false);
});

test('Meta Diagnóstico usa encabezado 1 y cuerpo 7 en es_CO, sin variables de botón', () => {
  const template = buildDiagnosisMetaTemplate({
    customerName: 'Santiago Mendez',
    workshopName: 'FrankorMotos',
    motorcycleInfo: 'Pulsar NS 200',
    plate: 'UDT9D',
    orderNumber: '34',
    workshopAddress: 'Calle 8 #12-34, Bogotá',
  });
  assert.equal(template.name, DIAGNOSIS_TEMPLATE_NAME);
  assert.equal(template.language.code, 'es_CO');
  assert.equal(template.components.length, 2);
  assert.equal(template.components[0].type, 'header');
  assert.deepEqual(template.components[0].parameters, [{ type: 'text', text: 'Diagnosticando' }]);
  assert.equal(template.components[1].type, 'body');
  assert.deepEqual(template.components[1].parameters.map(p => p.text), [
    'Santiago Mendez', 'FrankorMotos', 'Pulsar NS 200', 'UDT9D',
    '34', 'Calle 8 #12-34, Bogotá', 'FrankorMotos',
  ]);
});

test('dirección y taller siempre son de la orden, sin mezclar datos de otros talleres', () => {
  const first = buildDiagnosisMetaTemplate({
    customerName: 'Ana', workshopName: 'FrankorMotos', motorcycleInfo: 'AKT',
    plate: 'ABC12D', orderNumber: '25', workshopAddress: 'Calle 8',
  });
  const second = buildDiagnosisMetaTemplate({
    customerName: 'Ana', workshopName: 'Otro Taller', motorcycleInfo: 'AKT',
    plate: 'ABC12D', orderNumber: '25', workshopAddress: 'Carrera 55',
  });
  assert.deepEqual(first.components[1].parameters.map(p => p.text).slice(0, 2),
    ['Ana', 'FrankorMotos']);
  assert.equal(second.components[1].parameters[1].text, 'Otro Taller');
  assert.equal(second.components[1].parameters[5].text, 'Carrera 55');
  assert.equal(second.components[1].parameters[6].text, 'Otro Taller');
  assert.ok(first.components.flatMap(c => c.parameters).every(p => !/[\r\n\t]/.test(p.text)));
});

test('Meta recibe parámetros planos y valores alternativos válidos', () => {
  const template = buildDiagnosisMetaTemplate({
    customerName: 'Ana\n  María', workshopName: ' ', motorcycleInfo: 'Pulsar',
    plate: '', orderNumber: '99', workshopAddress: '',
  });
  const v = template.components[1].parameters.map(p => p.text);
  assert.equal(v[0], 'Ana María');
  assert.equal(v[1], 'el taller');
  assert.equal(v[3], 'Sin placa');
  assert.equal(v[5], 'Consulta la dirección con el taller');
});

test('las nuevas órdenes comienzan en diagnóstico, no en ingreso a revisión', () => {
  assert.equal(NEW_WORK_ORDER_DB_STATUS, 'diagnosis');
});

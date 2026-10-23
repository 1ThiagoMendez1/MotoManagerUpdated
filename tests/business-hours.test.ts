import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBusinessHours, formatBusinessHours, parseBusinessHours } from '../src/lib/business-hours';
import { composeReadyNotice, readyNoticeTemplateParameters, readyDynamicTemplateName } from '../src/lib/whatsapp-ready';

const base = () => {
  const hours = emptyBusinessHours();
  for (const day of ['monday','tuesday','wednesday','thursday','friday'] as const) {
    hours[day] = [{ open: '09:00', close: '13:00' }, { open: '15:00', close: '19:00' }];
  }
  hours.saturday = [{ open: '09:00', close: '14:00' }];
  return hours;
};

const notice = (hours: unknown) => ({
  customerName: 'Santiago', workshopName: 'FrankorMotos',
  motorcycleInfo: 'General Moto', plate: 'JUH12K', orderNumber: '83',
  workshopAddress: 'Calle 8', businessHours: hours,
});

test('agrupa días consecutivos sin cruzar horarios entre talleres', () => {
  const frankor = base();
  const other = emptyBusinessHours();
  other.monday = [{ open: '07:30', close: '12:30' }];
  assert.match(formatBusinessHours(frankor), /Lunes a viernes: 9:00 a. m. a 1:00 p. m. y 3:00 p. m. a 7:00 p. m./);
  assert.match(formatBusinessHours(frankor), /Sábado: 9:00 a. m. a 2:00 p. m./);
  assert.match(formatBusinessHours(other), /Lunes: 7:30 a. m. a 12:30 p. m./);
  assert.doesNotMatch(formatBusinessHours(other), /9:00 a. m./);
});

test('nunca inventa horarios cuando faltan en el perfil', () => {
  const text = composeReadyNotice(notice(null));
  assert.match(text, /Horario no configurado/);
  assert.doesNotMatch(text, /Lunes a viernes/);
  assert.doesNotMatch(text, /09:00/);
});

test('rechaza intervalos invertidos, solapados y días faltantes', () => {
  const inverted = base(); inverted.monday[0].close = '08:00';
  assert.equal(parseBusinessHours(inverted), null);
  const overlap = base(); overlap.tuesday[1].open = '12:30';
  assert.equal(parseBusinessHours(overlap), null);
  assert.equal(parseBusinessHours({ monday: [] }), null);
  const invalidTime = base(); invalidTime.saturday[0].open = '24:00';
  assert.equal(parseBusinessHours(invalidTime), null);
});

test('mensaje de entrega y parámetros Meta incluyen los horarios exclusivos del taller', () => {
  const text = composeReadyNotice(notice(base()));
  const fields = readyNoticeTemplateParameters(notice(base()));
  assert.match(text, /FrankorMotos/);
  assert.match(text, /Sábado/);
  assert.equal(fields.length, 8);
  assert.equal(fields[5], 'Calle 8');
  assert.match(fields[6], /Lunes a viernes/);
  assert.equal(fields[7], 'FrankorMotos');
});

test('Meta recibe horarios completos por taller sin saltos de línea ni tabulaciones en las ocho variables', () => {
  const frankor = notice(base());
  const another = emptyBusinessHours();
  another.monday = [{ open: '07:30', close: '12:30' }];
  const values = readyNoticeTemplateParameters({ ...frankor, customerName: 'Santiago\nMendez',
    workshopAddress: 'Calle 8\tLocal 2' });
  assert.equal(values.length, 8);
  assert.ok(values.every(value => !/[\r\n\t]| {5,}/.test(value)));
  assert.match(values[6], /Lunes a viernes:/);
  assert.match(values[6], /; Sábado:/);
  assert.match(values[6], /; Domingo: Cerrado/);
  assert.equal(values[0], 'Santiago Mendez');
  assert.equal(values[5], 'Calle 8 Local 2');
  const different = readyNoticeTemplateParameters({ ...frankor, workshopName: 'Otro taller',
    businessHours: another });
  assert.match(different[6], /Lunes: 7:30 a. m. a 12:30 p. m./);
  assert.doesNotMatch(different[6], /9:00 a. m./);
  assert.match(composeReadyNotice(frankor), /\nSábado:/);
});

test('una configuración vieja nunca selecciona la plantilla Meta con horas fijas', () => {
  assert.equal(readyDynamicTemplateName(undefined), 'diagnosticado_reparado_horarios');
  assert.equal(readyDynamicTemplateName('diagnosticado_reparado'), null);
  assert.equal(readyDynamicTemplateName('diagnosticado_reparado_horarios'), 'diagnosticado_reparado_horarios');
  assert.equal(readyDynamicTemplateName('bad template'), null);
  assert.equal(readyDynamicTemplateName(''), null);
});

test('días cerrados se distinguen de días abiertos y validan el formato', () => {
  const hours = emptyBusinessHours();
  hours.sunday = [{ open: '10:00', close: '12:00' }];
  assert.match(formatBusinessHours(hours), /Lunes a sábado: Cerrado/);
  assert.match(formatBusinessHours(hours), /Domingo: 10:00 a. m. a 12:00 p. m./);
  assert.ok(parseBusinessHours(hours));
});

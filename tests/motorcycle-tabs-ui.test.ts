import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('Motocicletas incluye pestañas independientes con estado y conteos', () => {
  const page = read('src/app/motorcycles/page.tsx');
  for (const label of ['Todas', 'Sin orden', 'Con orden activa', 'Finalizadas']) {
    assert.ok(page.includes(label), 'Falta pestaña ' + label);
  }
  assert.match(page, /motorcycleMatchesTab\(moto\.id, estado, orderIndex\)/);
  assert.match(page, /filteredMotorcycles\.slice\(/);
  assert.match(page, /aria-current=\{estado === tab\.value \? 'page' : undefined\}/);
  assert.match(page, /currentOrder\?\.label \|\| 'Sin orden'/);
  assert.match(page, /\/work-orders\/\$\{currentOrder\.id\}/);
});

test('Carga estados de la misma organización, por páginas, sin cortar resultados', () => {
  const service = read('src/lib/motorcycle-order-list.ts');
  assert.match(service, /\.eq\('organization_id', organizationId\)/);
  assert.match(service, /\.in\('motorcycle_id', motorcycleIds\)/);
  assert.match(service, /\.range\(offset, offset \+ 499\)/);
  assert.match(service, /for \(let start = 2; start <= first\.totalPages/);
  assert.match(service, /if \(error\)/);
  assert.match(service, /throw new Error/);
});

test('Órdenes de Trabajo conserva activos y finalizados y añade Sin orden', () => {
  const page = read('src/app/work-orders/page.tsx');
  assert.match(page, /value="without"/);
  assert.match(page, /value="active"/);
  assert.match(page, /value="completed"/);
  assert.match(page, /motorcycleMatchesTab\(moto\.id, 'without'/);
  assert.match(page, /motorcyclesWithoutOrder\.map/);
  assert.match(page, /<StatusBadge status=\{order\.status\}/);
});

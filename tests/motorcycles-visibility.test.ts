import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Estos controles evitan repetir un borrado visual de motos por órdenes históricas.
test('Recepción muestra las motocicletas existentes aunque tengan órdenes', () => {
  const source = readFileSync('src/app/motorcycles/page.tsx', 'utf8');
  assert.match(source, /motorcycles\.map\(\(moto\)\s*=>/);
  assert.doesNotMatch(source, /motorcyclesInWorkshop|workOrderMotorcycleIds/);
  assert.match(source, /getMotorcycles\(\{ query, page \}\)/);
});
test('el lector de motocicletas aplica el taller autenticado y no oculta errores', () => {
  const source = readFileSync('src/lib/data.ts', 'utf8');
  const start = source.indexOf('export const getMotorcycles');
  const end = source.indexOf('export const getInventory', start);
  assert.ok(start >= 0 && end > start);
  const implementation = source.slice(start, end);
  assert.match(implementation, /\.eq\('organization_id', user\.workshopId\)/);
  assert.match(implementation, /if \(error\)\s*\{/);
  assert.match(implementation, /throw new Error\(/);
});
test('el panel de administración no confunde plan con periodicidad', () => {
  const source = readFileSync('src/app/admin/page.tsx', 'utf8');
  assert.match(source, /billing_cycle/);
  assert.doesNotMatch(source, /w\.subscription_plan === '(monthly|biannual|yearly)'/);
});

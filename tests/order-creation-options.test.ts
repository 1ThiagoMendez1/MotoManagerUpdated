import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');

test('las dos rutas usan las mismas opciones de selección de motos', () => {
  const orders = source('src/app/work-orders/page.tsx');
  const dashboard = source('src/app/[tenant]/page.tsx');
  assert.match(orders, /getOrderCreationOptions\(\)/);
  // The home menu no longer blocks navigation on modal-only selectors.
  assert.doesNotMatch(dashboard, /getOrderCreationOptions\(\)/);
  const endpoint = source('src/app/api/workshop/options/route.ts');
  assert.match(endpoint, /authorize\('\/work-orders'\)/);
  assert.match(endpoint, /getOrderCreationOptions\(\)/);
  assert.match(source('src/components/dashboard/DashboardMenu.tsx'), /<AddWorkOrder lazy/);
  assert.match(source('src/components/forms/AddWorkOrder.tsx'), /fetch\('\/api\/workshop\/options'/);
  assert.doesNotMatch(orders, /motorcyclesWithoutAnyWorkOrder/);
  assert.doesNotMatch(dashboard, /motorcyclesWithoutAnyWorkOrder/);
  assert.match(orders, /unavailableMotorcycleIds=\{unavailableMotorcycleIds\}/);
  assert.match(source('src/components/dashboard/DashboardMenu.tsx'), /unavailableMotorcycleIds=\{unavailableMotorcycleIds\}/);
});

test('la consulta excluye estados terminados, no todo el historial', () => {
  const options = source('src/lib/work-orders/order-creation-options.ts');
  assert.match(options, /\.eq\('organization_id', user\.workshopId\)/);
  assert.match(options, /\.not\('status', 'in', '\(delivered,delivered_quote_rejected,cancelled\)'\)/);
  assert.match(options, /getMotorcycles\(\{ limit: 1000 \}\)/);
  assert.match(options, /if \(error\)/);
  assert.match(options, /throw new Error/);
});

test('el selector etiqueta motos con orden abierta y deshabilita su opción', () => {
  const form = source('src/components/forms/AddWorkOrder.tsx');
  assert.match(form, /disabled=\{blockedIds\.has\(moto\.id\)\}/);
  assert.match(form, /orden abierta/);
  assert.match(form, /!canCreateOrder/);
});

test('el servidor rechaza duplicados y fallos de verificación', () => {
  const action = source('src/lib/actions/work-orders.ts');
  assert.match(action, /if \(activeOrdersError\)/);
  assert.match(action, /Esta motocicleta ya tiene una orden de trabajo activa/);
});

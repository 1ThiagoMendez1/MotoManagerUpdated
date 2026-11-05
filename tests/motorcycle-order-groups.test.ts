import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMotorcycleOrderIndex, isClosedMotorcycleOrder,
  motorcycleMatchesTab, motorcycleOrderLabel, type MotorcycleOrderRow,
} from '../src/lib/motorcycle-order-groups';

const order = (id: string, motorcycle_id: string, status: string, created_at: string): MotorcycleOrderRow =>
  ({ id, motorcycle_id, status, created_at, order_number: id });

test('motos sin órdenes aparecen solo en Sin orden y Todas', () => {
  const index = buildMotorcycleOrderIndex([]);
  assert.equal(motorcycleMatchesTab('m1', 'without', index), true);
  assert.equal(motorcycleMatchesTab('m1', 'all', index), true);
  assert.equal(motorcycleMatchesTab('m1', 'active', index), false);
  assert.equal(motorcycleMatchesTab('m1', 'finished', index), false);
});

test('motos con orden entregada o cancelada aparecen en Finalizadas', () => {
  const index = buildMotorcycleOrderIndex([
    order('1', 'm1', 'delivered', '2026-10-01'),
    order('2', 'm2', 'delivered_quote_rejected', '2026-10-01'),
    order('3', 'm3', 'cancelled', '2026-10-01'),
  ]);
  for (const id of ['m1', 'm2', 'm3']) {
    assert.equal(motorcycleMatchesTab(id, 'finished', index), true);
    assert.equal(motorcycleMatchesTab(id, 'without', index), false);
  }
});

test('orden abierta tiene prioridad sobre una antigua entregada', () => {
  const index = buildMotorcycleOrderIndex([
    order('entregada', 'm1', 'delivered', '2026-10-28'),
    order('activa', 'm1', 'diagnosis', '2026-10-25'),
    order('otra', 'm2', 'received', '2026-10-29'),
  ]);
  assert.equal(index.get('m1')?.id, 'activa');
  assert.equal(index.get('m1')?.label, 'Diagnosticando');
  assert.equal(motorcycleMatchesTab('m1', 'active', index), true);
  assert.equal(motorcycleMatchesTab('m1', 'finished', index), false);
  assert.equal(motorcycleMatchesTab('m2', 'active', index), true);
});

test('reparada sigue abierta hasta que se entregue y conserva estado útil', () => {
  assert.equal(isClosedMotorcycleOrder('completed'), false);
  assert.equal(motorcycleOrderLabel('completed'), 'Reparada · pendiente de entrega');
  const index = buildMotorcycleOrderIndex([order('o', 'm', 'completed', '2026-10-28')]);
  assert.equal(index.get('m')?.tab, 'active');
});

test('se muestra la orden abierta más reciente, sin duplicar la moto', () => {
  const index = buildMotorcycleOrderIndex([
    order('vieja', 'm', 'received', '2026-09-10'),
    order('nueva', 'm', 'diagnosis', '2026-10-10'),
    order('historial', 'm', 'delivered', '2026-10-11'),
  ]);
  assert.equal(index.size, 1);
  assert.equal(index.get('m')?.id, 'nueva');
});

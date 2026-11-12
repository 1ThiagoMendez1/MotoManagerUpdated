import test from 'node:test';
import assert from 'node:assert/strict';
import { canInvoiceWorkOrder, serviceCheckoutTotals, type CheckoutItem } from '../src/lib/service-checkout';

const part: CheckoutItem = { inventoryItemId: 'part', name: 'Filtro', quantity: 1, price: 80000, type: 'inventory', fromWorkOrder: true };
const service: CheckoutItem = { inventoryItemId: 'labor', name: 'Servicio', quantity: 1, price: 100000, type: 'service', fromWorkOrder: true };

test('la cuenta incluye mano de obra una sola vez, aplica descuento solo a repuestos y resta abonos', () => {
  assert.deepEqual(serviceCheckoutTotals([part, service], 100000, 10, 100000), {
    products: 80000, subtotal: 180000, discountAmount: 8000, total: 172000, deposit: 100000, remaining: 72000, excess: 0,
  });
  const extra = { ...part, inventoryItemId: 'extra', price: 20000, quantity: 2, fromWorkOrder: false };
  assert.equal(serviceCheckoutTotals([part, service, extra], 125000, 0, 100000).remaining, 145000);
});

test('abono completo cierra sin otro cobro y el excedente queda visible sin convertirlo en descuento', () => {
  const paid = serviceCheckoutTotals([part], 0, 0, 80000);
  assert.equal(paid.remaining, 0); assert.equal(paid.excess, 0); assert.equal(paid.total, 80000);
  const excess = serviceCheckoutTotals([part], 0, 0, 100000);
  assert.equal(excess.remaining, 0); assert.equal(excess.excess, 20000); assert.equal(excess.deposit, 100000);
  assert.equal(serviceCheckoutTotals([], 0, 0, 0).remaining, 0);
});

test('la vista previa redondea líneas y descuento a centavos como el cierre de caja', () => {
  const totals = serviceCheckoutTotals([{ ...part, price: 19.99, quantity: 3 }], 10, 12.5, 20);
  assert.equal(totals.products, 59.97); assert.equal(totals.discountAmount, 7.5);
  assert.equal(totals.total, 62.47); assert.equal(totals.remaining, 42.47);
});

test('solo se ofrece facturar una orden reparada o histórica pendiente, sin volver a emitir una factura', () => {
  assert.equal(canInvoiceWorkOrder({ status: 'Reparado' }), true);
  assert.equal(canInvoiceWorkOrder({ status: 'Diagnosticando' }), false);
  assert.equal(canInvoiceWorkOrder({ status: 'Entregado' }), false);
  assert.equal(canInvoiceWorkOrder({ status: 'Entregado', requiresServiceInvoice: true }), true);
  assert.equal(canInvoiceWorkOrder({ status: 'Reparado', invoiceTotal: 0 }), false);
  assert.equal(canInvoiceWorkOrder({ status: 'Entregado', requiresServiceInvoice: true, invoiceTotal: 100000 }), false);
});

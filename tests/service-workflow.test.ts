import test from 'node:test';
import assert from 'node:assert/strict';
import { colombiaSettlementRange, inventorySearchMatch, isOrderDeposit, serviceInvoiceTotal } from '../src/lib/work-order-finance';

test('SKU exacto y resultado único seleccionan; resultados ambiguos y vacíos no seleccionan', () => {
  const items = [{id:'a',sku:'FA-001',name:'Filtro de aceite'},{id:'b',sku:'FA-001-X',name:'Filtro especial'},{id:'c',sku:'ACE-1',name:'Aceite 20W50'}];
  assert.equal(inventorySearchMatch(items,' fa-001 ').selectedId,'a');
  assert.equal(inventorySearchMatch(items,'20w50').selectedId,'c');
  assert.equal(inventorySearchMatch(items,'Filtro').selectedId,'');
  assert.equal(inventorySearchMatch(items,'desconocido').selectedId,'');
  assert.equal(inventorySearchMatch(items,'').selectedId,'');
  assert.equal(inventorySearchMatch([...items, {id:'d',sku:'FA-001',name:'Duplicado'}],'FA-001').selectedId,'');
});
test('abonos históricos y nuevos no son facturas; el recibo muestra valor completo y saldo por separado', () => {
  assert.equal(isOrderDeposit({sale_number:'AB-150-0144'}),true);
  assert.equal(isOrderDeposit({sale_number:'SALE-AB-150-0144'}),true);
  assert.equal(isOrderDeposit({notes:'Abono de orden #150'}),true);
  assert.equal(isOrderDeposit({is_deposit:true}),true);
  assert.equal(isOrderDeposit({sale_number:'VS150'}),false);
  assert.equal(serviceInvoiceTotal({invoice_total:180000,total:80000,work_order_id:'order'},100000),180000);
  assert.equal(serviceInvoiceTotal({total:80000,work_order_id:'order'},100000),180000);
  assert.equal(serviceInvoiceTotal({total:80000},100000),80000);
});
test('periodos incluyen ambos días completos en Colombia, sin cambiar al día anterior por UTC', () => {
  assert.deepEqual(colombiaSettlementRange('2026-11-01','2026-11-10'), {start:'2026-11-01T05:00:00.000Z',endExclusive:'2026-11-11T05:00:00.000Z'});
  assert.deepEqual(colombiaSettlementRange('2026-12-31','2026-12-31'), {start:'2026-12-31T05:00:00.000Z',endExclusive:'2027-01-01T05:00:00.000Z'});
  for (const values of [['2026-11-11','2026-11-10'],['2026-02-30','2026-03-01'],['','2026-11-01']]) assert.throws(()=>colombiaSettlementRange(...values as [string,string]));
});

import type { WorkOrder } from './types';

export type CheckoutItem = {
  inventoryItemId: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  type: string;
  fromWorkOrder: boolean;
};

export function canInvoiceWorkOrder(order: Pick<WorkOrder, 'status' | 'requiresServiceInvoice' | 'invoiceTotal'>) {
  return order.invoiceTotal == null && (order.status === 'Reparado' || order.requiresServiceInvoice === true);
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function serviceCheckoutTotals(items: CheckoutItem[], labor: number, discount: number, deposit: number) {
  const products = money(items.filter(item => item.type !== 'service').reduce((sum, item) => sum + money(item.price * item.quantity), 0));
  const discountAmount = money(products * discount / 100);
  const subtotal = money(products + labor);
  const total = money(subtotal - discountAmount);
  return { products, subtotal, discountAmount, total, deposit, remaining: money(Math.max(0, total - deposit)), excess: money(Math.max(0, deposit - total)) };
}

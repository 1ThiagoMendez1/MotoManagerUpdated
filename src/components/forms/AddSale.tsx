'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Banknote, Check, CreditCard, Loader2, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ReceiptDialog } from '@/components/ui/receipt-dialog';
import { useToast } from '@/hooks/use-toast';
import { createServiceSale } from '@/lib/actions/sales';
import { inventorySearchMatch } from '@/lib/work-order-finance';
import { canInvoiceWorkOrder, serviceCheckoutTotals, type CheckoutItem } from '@/lib/service-checkout';
import type { InventoryItem, WorkOrder } from '@/lib/types';

const METHODS = ['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros'] as const;
const money = (value: number) => value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

type AddSaleProps = {
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
  initialWorkOrderId?: string;
  autoOpen?: boolean;
  onReviewDeposit?: () => void;
};

export function AddSale({ workOrders, inventory, initialWorkOrderId, autoOpen = false, onReviewDeposit }: AddSaleProps) {
  const fixedOrder = Boolean(initialWorkOrderId);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [orderId, setOrderId] = useState(initialWorkOrderId || '');
  const [plateSearch, setPlateSearch] = useState('');
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [labor, setLabor] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<typeof METHODS[number]>('Efectivo');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadedOrderId, setLoadedOrderId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reload, setReload] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [additionsOpen, setAdditionsOpen] = useState(false);
  const [extraLabor, setExtraLabor] = useState(0);
  const requestId = useRef('');
  const submitting = useRef(false);
  const prefix = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const selectedOrder = workOrders.find(order => order.id === orderId);
  const eligible = workOrders.filter(canInvoiceWorkOrder);
  const orderMatches = eligible.filter(order => `${order.motorcycle.plate} ${order.workOrderNumber} ${order.motorcycle.customer.name}`.toLocaleLowerCase('es-CO').includes(plateSearch.trim().toLocaleLowerCase('es-CO')));
  const productMatches = inventorySearchMatch(inventory, productSearch).matches;
  const product = inventory.find(item => item.id === productId);
  const extraQuantity = items.filter(item => !item.fromWorkOrder && item.inventoryItemId === productId).reduce((sum, item) => sum + item.quantity, 0);
  const available = product ? Math.max(0, product.quantity - extraQuantity) : 0;
  const canAddProduct = product && Number.isInteger(Number(quantity)) && Number(quantity) > 0 && (product.trackInventory === false || Number(quantity) <= available);
  const totals = serviceCheckoutTotals(items, labor + extraLabor, discount, deposit);
  const ready = Boolean(orderId) && loadedOrderId === orderId && !loading && !loadError;

  useEffect(() => {
    if (!isOpen || !orderId) return;
    const controller = new AbortController();
    setLoading(true); setLoadedOrderId(''); setLoadError(''); setSubmitError('');
    setItems([]); setLabor(0); setExtraLabor(0); setDeposit(0); setDiscount(0);
    setPaymentMethod('Efectivo'); setCustomDate(''); setProductSearch(''); setProductId(''); setQuantity('1'); setAdditionsOpen(false);
    requestId.current = crypto.randomUUID();
    void (async () => {
      try {
        const response = await fetch(`/api/work-orders/${orderId}/items`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la cuenta.');
        if (!data.billable) throw new Error('La orden debe estar reparada y pendiente de facturar.');
        if (!Array.isArray(data.items) || !Number.isFinite(Number(data.depositAmount)) || Number(data.depositAmount) < 0 || !Number.isFinite(Number(data.laborCost)) || Number(data.laborCost) < 0) throw new Error('No se recibió la cuenta completa.');
        const loaded: CheckoutItem[] = data.items.map((item: CheckoutItem) => ({ ...item, price: Number(item.price), quantity: Number(item.quantity), fromWorkOrder: true }));
        if (loaded.some(item => !item.inventoryItemId || !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity <= 0)) throw new Error('Revisa los cargos de la orden antes de facturar.');
        if (controller.signal.aborted) return;
        setItems(loaded); setLabor(Number(data.laborCost));
        setDeposit(Number(data.depositAmount)); setLoadedOrderId(orderId);
      } catch (error: any) {
        if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar la cuenta.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [isOpen, orderId, reload]);

  function changeOpen(open: boolean) {
    if (submitting.current) return;
    if (open) setLoadedOrderId('');
    setIsOpen(open);
  }

  function searchOrder(value: string) {
    setPlateSearch(value);
    const matches = eligible.filter(order => `${order.motorcycle.plate} ${order.workOrderNumber} ${order.motorcycle.customer.name}`.toLocaleLowerCase('es-CO').includes(value.trim().toLocaleLowerCase('es-CO')));
    setOrderId(value.trim() && matches.length === 1 ? matches[0].id : '');
  }

  function addProduct() {
    if (!canAddProduct || !product) return;
    setItems(current => [...current, { inventoryItemId: product.id, name: product.name, sku: product.sku, quantity: Number(quantity), price: product.price, type: 'inventory', fromWorkOrder: false }]);
    setProductSearch(''); setProductId(''); setQuantity('1');
    searchInput.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !ready || totals.excess > 0) return;
    // A typed/selected extra must be added explicitly, rather than silently left off the invoice.
    if (productSearch.trim() || productId || Number(quantity) !== 1) {
      setSubmitError('Tienes un repuesto sin agregar. Agrégalo o limpia la búsqueda antes de facturar.');
      setAdditionsOpen(true); searchInput.current?.focus(); return;
    }
    if (!Number.isFinite(labor + extraLabor) || labor + extraLabor < 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) {
      setSubmitError('Revisa la mano de obra y el descuento.'); return;
    }
    submitting.current = true; setIsSubmitting(true); setSubmitError('');
    try {
      const data = new FormData();
      data.set('requestId', requestId.current); data.set('workOrderId', orderId);
      data.set('laborCost', String(labor + extraLabor)); data.set('paymentMethod', paymentMethod);
      data.set('date', (customDate ? new Date(customDate) : new Date()).toISOString());
      data.set('items', JSON.stringify(items)); data.set('discountPercentage', String(discount));
      data.set('depositAmount', String(deposit));
      const result = await createServiceSale(null, data);
      if (!result.success || !result.sale) throw new Error(result.message || 'No se pudo facturar.');
      setReceipt(result.sale); setReceiptOpen(true); setIsOpen(false);
      toast({ title: 'Servicio facturado', description: 'La moto quedó entregada. Tu comprobante está listo.' });
      router.refresh();
    } catch (error: any) { setSubmitError(error.message || 'No se pudo facturar. Intenta de nuevo.'); }
    finally { submitting.current = false; setIsSubmitting(false); }
  }

  return <>
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      {(!fixedOrder || (selectedOrder && canInvoiceWorkOrder(selectedOrder))) && <DialogTrigger asChild>
        <Button variant={fixedOrder ? 'default' : 'outline'} className={fixedOrder ? 'bg-emerald-600 text-white hover:bg-emerald-700' : undefined}>
          <ReceiptText className="mr-2 h-4 w-4" />{fixedOrder ? 'Facturar' : 'Venta por Servicio'}
        </Button>
      </DialogTrigger>}
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-2xl" onEscapeKeyDown={event => { if (isSubmitting) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl"><ReceiptText className="h-5 w-5 text-emerald-500" />Facturar servicio</DialogTitle>
          <DialogDescription>Revisa el saldo, elige cómo te pagan y factura. La moto quedará entregada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {!fixedOrder && <div className="space-y-2">
              <label htmlFor={prefix + '-order-search'} className="text-sm font-semibold">Busca la moto o el cliente</label>
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id={prefix + '-order-search'} placeholder="Placa, cliente o número de orden" value={plateSearch} onChange={event => searchOrder(event.target.value)} className="pl-9" disabled={isSubmitting} /></div>
              <select aria-label="Orden de trabajo para facturar" value={orderId} onChange={event => setOrderId(event.target.value)} disabled={isSubmitting} className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Selecciona una orden reparada</option>
                {orderMatches.map(order => <option key={order.id} value={order.id}>{order.motorcycle.plate} · {order.workOrderNumber} · {order.motorcycle.customer.name}</option>)}
              </select>
              {eligible.length === 0 && <p className="text-sm text-muted-foreground">No hay órdenes reparadas pendientes de facturar.</p>}
            </div>}
            {selectedOrder && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
              <div><strong className="font-mono">{selectedOrder.motorcycle.plate}</strong><span className="ml-2 text-muted-foreground">{selectedOrder.workOrderNumber}</span><p className="mt-1 break-words text-xs text-muted-foreground">{selectedOrder.motorcycle.customer.name} · {selectedOrder.motorcycle.make} {selectedOrder.motorcycle.model}</p></div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{selectedOrder.requiresServiceInvoice ? 'Pendiente de facturar' : 'Reparado'}</span>
            </div>}
            {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparando la cuenta…</p>}
            {loadError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><p>{loadError}</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setReload(value => value + 1)}>Volver a cargar</Button></div>}
            {ready && <>
              <div className="rounded-xl border bg-card p-4" aria-label="Resumen para facturar">
                <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">Total del servicio</span><strong>{money(totals.total)}</strong></div>
                {totals.discountAmount > 0 && <p className="mt-1 text-xs text-muted-foreground">Incluye {money(totals.discountAmount)} de descuento en repuestos.</p>}
                <div className="mt-3 flex justify-between gap-3 text-sm text-emerald-600 dark:text-emerald-400"><span>Abonos recibidos</span><strong>−{money(deposit)}</strong></div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t pt-3"><span className="font-semibold">Cobrar ahora</span><strong className="text-3xl tracking-tight text-primary" aria-live="polite">{money(totals.remaining)}</strong></div>
                {totals.remaining === 0 && totals.excess === 0 && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" />{deposit > 0 ? 'Cubierto con los abonos. No hay otro cobro.' : 'Sin saldo por cobrar.'}</p>}
              </div>
              {totals.excess > 0 && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p>Los abonos superan la factura en <strong>{money(totals.excess)}</strong>. Revisa los cargos o registra la devolución del excedente antes de facturar.</p>
                {onReviewDeposit ? <Button type="button" variant="link" className="h-auto px-0 pt-2" onClick={() => { setIsOpen(false); onReviewDeposit(); }}>Revisar abonos</Button> : <Link href={`/work-orders/${orderId}?tab=pagos`} className="mt-2 inline-block font-semibold underline">Revisar abonos</Link>}
              </div>}
              <fieldset disabled={isSubmitting} className="min-w-0 space-y-4">
                {totals.remaining > 0 && <div>
                  <p className="mb-2 text-sm font-semibold">¿Cómo te paga el cliente?</p>
                  <div role="group" aria-label="Método de pago" className="grid grid-cols-3 gap-2 sm:grid-cols-6">{METHODS.map(method => <button key={method} type="button" aria-pressed={paymentMethod === method} onClick={() => setPaymentMethod(method)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition ${paymentMethod === method ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    {method === 'Efectivo' ? <Banknote className="h-4 w-4" /> : method === 'Tarjeta' ? <CreditCard className="h-4 w-4" /> : <span className="grid h-4 w-4 place-items-center text-xs font-extrabold">{method.slice(0,1)}</span>}{method}
                  </button>)}</div>
                </div>}
                <details className="rounded-xl border" open={additionsOpen} onToggle={event => setAdditionsOpen(event.currentTarget.open)}>
                  <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">Agregar algo más <span className="font-normal text-muted-foreground">· opcional</span></summary>
                  <div className="space-y-3 border-t p-3">
                    <label htmlFor={prefix + '-product'} className="block text-xs font-semibold">Repuesto por nombre o código</label>
                    <Input ref={searchInput} id={prefix + '-product'} placeholder="Ej. FA-001 o filtro de aceite" value={productSearch} onChange={event => { setProductSearch(event.target.value); setProductId(inventorySearchMatch(inventory, event.target.value).selectedId); setSubmitError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addProduct(); } }} />
                    {productSearch.trim() && <>
                      <select aria-label="Repuesto adicional" value={productId} onChange={event => setProductId(event.target.value)} className="h-11 w-full rounded-md border bg-background px-2 text-sm"><option value="">{productMatches.length ? 'Selecciona un repuesto' : 'Sin coincidencias'}</option>{productMatches.slice(0,100).map(item => <option key={item.id} value={item.id}>{item.name} · {item.sku} · {money(item.price)}</option>)}</select>
                      <div className="flex items-end gap-2"><div className="flex-1"><label htmlFor={prefix + '-quantity'} className="mb-1 block text-xs">Cantidad</label><Input id={prefix + '-quantity'} type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addProduct(); } }} /></div><Button type="button" variant="outline" disabled={!canAddProduct} onClick={addProduct}><Plus className="mr-1 h-4 w-4" />Agregar</Button></div>
                      {product && <p className="text-xs text-muted-foreground">{product.trackInventory === false ? 'Artículo sin control de existencias.' : `Disponibles para agregar: ${available}`}</p>}
                    </>}
                    {items.some(item => !item.fromWorkOrder) && <ul className="space-y-2">{items.map((item,index) => !item.fromWorkOrder && <li key={index} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-2 text-xs"><span className="min-w-0 break-words">{item.quantity} × {item.name} · {money(item.quantity * item.price)}</span><Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${item.name}`} onClick={() => setItems(current => current.filter((_,position) => position !== index))}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>}
                    <div><label htmlFor={prefix + '-extra-labor'} className="mb-1 block text-xs font-semibold">Mano de obra adicional (COP)</label><CurrencyInput id={prefix + '-extra-labor'} value={extraLabor} onValueChange={setExtraLabor} /></div>
                  </div>
                </details>
                <details className="rounded-xl border">
                  <summary className="cursor-pointer px-3 py-3 text-sm text-muted-foreground">Ver cargos y otras opciones</summary>
                  <div className="space-y-3 border-t p-3">
                    <ul className="space-y-2 text-xs">{items.filter(item => item.fromWorkOrder).map((item,index) => <li key={index} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item.quantity} × {item.name}</span><span className="shrink-0">{money(item.price * item.quantity)}</span></li>)}</ul>
                    <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor={prefix + '-labor'} className="mb-1 block text-xs">Costo mano de obra (COP)</label><CurrencyInput id={prefix + '-labor'} value={labor} onValueChange={setLabor} /></div><div><label htmlFor={prefix + '-discount'} className="mb-1 block text-xs">Descuento en repuestos (%)</label><Input id={prefix + '-discount'} type="number" min="0" max="100" step="0.01" value={discount} onChange={event => setDiscount(Number(event.target.value))} /></div></div>
                    <div><label htmlFor={prefix + '-date'} className="mb-1 block text-xs">Fecha y hora del cobro (opcional)</label><Input id={prefix + '-date'} type="datetime-local" value={customDate} onChange={event => setCustomDate(event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Si lo dejas vacío, se usa la fecha y hora al facturar.</p></div>
                  </div>
                </details>
              </fieldset>
            </>}
            {submitError && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/20 px-5 py-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => changeOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={!ready || isSubmitting || totals.excess > 0} className="min-h-11 bg-emerald-600 px-5 text-white hover:bg-emerald-700">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}{isSubmitting ? 'Facturando…' : 'Facturar y entregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {receipt && <ReceiptDialog isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} receiptData={receipt} />}
  </>;
}

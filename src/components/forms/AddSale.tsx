"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, Wrench, PlusCircle, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder, InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createServiceSale } from '@/lib/actions/sales';
import { ReceiptDialog } from '@/components/ui/receipt-dialog';
import { useRouter } from 'next/navigation';

const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Selecciona un producto"),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Mínimo 1"),
  price: z.coerce.number(),
  // Marca si el ítem viene precargado desde la orden de trabajo
  fromWorkOrder: z.boolean().optional(),
});

const formSchema = z.object({
  workOrderId: z.string().min(1, 'Se requiere la orden de trabajo.'),
  laborCost: z.coerce.number().min(0, "El costo no puede ser negativo."),
  paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Otros'], {
    required_error: "Se requiere seleccionar un medio de pago.",
  }),
  date: z.date({
    required_error: "Se requiere una fecha.",
  }),
  items: z.array(saleItemSchema).optional(),
  discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
  depositAmount: z.coerce.number().min(0, "El abono no puede ser negativo.").optional(),
});

type AddSaleProps = {
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
};

export function AddSale({ workOrders, inventory }: AddSaleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [plateSearch, setPlateSearch] = useState('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workOrderId: '',
      laborCost: undefined,
      paymentMethod: 'Efectivo',
      date: new Date(),
      items: [],
      discountPercentage: 0,
      depositAmount: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { isSubmitting } = form.formState;
  const watchItems = form.watch("items");
  const watchLaborCost = form.watch("laborCost");
  const watchDiscount = form.watch("discountPercentage");
  const watchWorkOrderId = form.watch("workOrderId");
  const watchDepositAmount = form.watch("depositAmount");

  // Cargar automáticamente los ítems ya usados en la orden de trabajo seleccionada
  useEffect(() => {
    async function loadWorkOrderItems(workOrderId: string) {
      setIsLoadingItems(true);
      try {
        const res = await fetch(`/api/work-orders/${workOrderId}/items`);
        if (!res.ok) {
          console.error('Error fetching work order items for service sale:', await res.text());
          form.setValue('items', [], { shouldValidate: true });
          return;
        }
        const data = await res.json();
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          form.setValue('items', [], { shouldValidate: true });
          return;
        }

        const mappedItems = data.items.map((item: any) => ({
          inventoryItemId: item.inventoryItemId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          fromWorkOrder: true,
        }));

        form.setValue('items', mappedItems, { shouldValidate: true });
      } catch (error) {
        console.error('Unexpected error loading work order items for service sale:', error);
      } finally {
        setIsLoadingItems(false);
      }
    }

    if (watchWorkOrderId) {
      loadWorkOrderItems(watchWorkOrderId);
      
      const selectedWO = workOrders.find(o => o.id === watchWorkOrderId);
      if (selectedWO?.depositAmount) {
        form.setValue('depositAmount', selectedWO.depositAmount);
      } else {
        form.setValue('depositAmount', undefined as any);
      }
    } else {
      form.setValue('items', [], { shouldValidate: true });
      form.setValue('depositAmount', undefined as any);
    }
  }, [watchWorkOrderId, form, workOrders]);

  const itemsTotal = watchItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const laborCostValue = watchLaborCost ? parseFloat(String(watchLaborCost)) : 0;
  // Subtotal general (productos + mano de obra)
  const subtotal = itemsTotal + laborCostValue;
  // El descuento solo aplica sobre el valor de los productos
  const discountAmount = itemsTotal * ((watchDiscount || 0) / 100);
  const total = subtotal - discountAmount;

  const depositAmountValue = watchDepositAmount ? parseFloat(String(watchDepositAmount)) : 0;
  const remainingBalanceTotal = Math.max(0, total - depositAmountValue);

  // Solo considerar órdenes de trabajo en estado Reparado para facturación
  const activeWorkOrders = workOrders.filter(order => order.status === 'Reparado');

  // Filter work orders based on plate search (solo activas)
  const filteredWorkOrders = plateSearch
    ? activeWorkOrders.filter(order =>
      order.motorcycle.plate.toLowerCase().includes(plateSearch.toLowerCase())
    )
    : activeWorkOrders;

  // Auto-select work order if only one matches the plate search (solo activas)
  const handlePlateSearch = (value: string) => {
    setPlateSearch(value);
    if (value) {
      const matchingOrders = activeWorkOrders.filter(order =>
        order.motorcycle.plate.toLowerCase().includes(value.toLowerCase())
      );
      if (matchingOrders.length === 1) {
        form.setValue('workOrderId', matchingOrders[0].id);
      } else if (matchingOrders.length === 0) {
        // Clear selection if no matches
        form.setValue('workOrderId', '');
      }
    } else {
      // Clear selection if search is empty
      form.setValue('workOrderId', '');
    }
  };

  function handleProductChange(value: string, index: number) {
    const selectedProduct = inventory.find(item => item.id === value);
    if (selectedProduct) {
      form.setValue(`items.${index}.price`, selectedProduct.price);
      form.setValue(`items.${index}.inventoryItemId`, selectedProduct.id);
      form.setValue(`items.${index}.sku`, selectedProduct.sku);
    }
  }

  function handleSkuChange(sku: string, index: number) {
    const selectedProduct = inventory.find(item => item.sku.toLowerCase() === sku.toLowerCase());
    if (selectedProduct) {
      form.setValue(`items.${index}.price`, selectedProduct.price);
      form.setValue(`items.${index}.inventoryItemId`, selectedProduct.id, { shouldValidate: true });
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Submitting service sale with items:', values.items);

    const formData = new FormData();
    formData.append('workOrderId', values.workOrderId);
    formData.append('laborCost', values.laborCost.toString());
    formData.append('paymentMethod', values.paymentMethod);
    formData.append('date', values.date.toISOString());
    formData.append('items', JSON.stringify(values.items || []));
    formData.append('discountPercentage', (values.discountPercentage || 0).toString());
    formData.append('depositAmount', (values.depositAmount || 0).toString());

    const result = await createServiceSale(null, formData);

    if (result.success && result.sale) {
      toast({
        title: "Éxito",
        description: "Nueva venta registrada correctamente.",
      });
      setIsOpen(false);
      form.reset();
      setPlateSearch('');
      router.refresh();

      // Show receipt dialog
      setReceiptData(result.sale);
      setReceiptDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: result.message || "Error al registrar la venta.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Wrench className="mr-2 h-4 w-4" />
            Venta por Servicio
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background">
          <div className="p-6 pb-2 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary" />
                Registrar Venta por Servicio
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Asocia una venta a una orden de trabajo, agrega repuestos y mano de obra.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                
                {/* Service Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-6 h-px bg-border"></span>
                    Información del Servicio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormItem>
                      <FormLabel>Buscar por Placa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Ingresa la placa para buscar..."
                            value={plateSearch}
                            onChange={(e) => handlePlateSearch(e.target.value)}
                            className="bg-background border-input pl-10 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="workOrderId"
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel>Orden de Trabajo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} name={field.name}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-input focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="Se autocompletará con la placa" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredWorkOrders.map(order => (
                                <SelectItem key={order.id} value={order.id}>
                                  {order.workOrderNumber} - {order.motorcycle.make} {order.motorcycle.model} ({order.motorcycle.plate})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="laborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Mano de Obra (COP)</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              placeholder="Ej: 120000"
                              value={field.value ?? ''}
                              onChange={(val) => field.onChange(val === '' ? undefined : val)}
                              className="bg-background border-input focus:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abono Recibido (COP)</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              placeholder="Ej: 50000"
                              value={field.value ?? ''}
                              onChange={(val) => field.onChange(val === '' ? undefined : val)}
                              className="bg-background border-input focus:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("pl-3 text-left font-normal bg-background border-input hover:bg-accent transition-all w-full", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <span className="w-6 h-px bg-border"></span>
                        Repuestos y Productos
                      </h3>
                      {isLoadingItems && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Cargando...</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => append({ inventoryItemId: '', sku: '', quantity: 1, price: 0 })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar Producto
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const currentItem = watchItems?.[index];
                      const selectedItem = inventory.find(item => item.id === currentItem?.inventoryItemId);
                      const isOutOfStock = selectedItem && selectedItem.quantity === 0;
                      const itemPrice = currentItem?.price || 0;
                      const itemQuantity = currentItem?.quantity || 0;
                      const itemSubtotal = itemPrice * itemQuantity;
                      const isFromWorkOrder = (currentItem as any)?.fromWorkOrder === true;

                      return (
                        <Card key={field.id} className="p-3 border-border/50 bg-background/50 hover:bg-muted/10 transition-colors">
                          <div className="grid grid-cols-[1fr,2fr,120px,auto] items-start gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.sku`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="SKU..." {...field}
                                      className="bg-background border-input focus:ring-primary/20"
                                      disabled={isFromWorkOrder}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleSkuChange(e.target.value, index);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.inventoryItemId`}
                              render={({ field: selectField }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => handleProductChange(value, index)}
                                    value={selectField.value}
                                    disabled={isFromWorkOrder}
                                  >
                                    <FormControl>
                                      <SelectTrigger className={`bg-background border-input ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''} ${isFromWorkOrder ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        <SelectValue placeholder="Selecciona un producto" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {inventory.map(item => (
                                        <SelectItem
                                          key={item.id}
                                          value={item.id}
                                          disabled={item.quantity === 0}
                                          className={item.quantity === 0 ? 'text-red-500' : ''}
                                        >
                                          {item.name} - ${item.price.toLocaleString('es-CO')} (Disp: {item.quantity})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        {...field}
                                        min={1}
                                        max={selectedItem?.quantity || 9999}
                                        className={`bg-background border-input pr-8 ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''}`}
                                        disabled={isOutOfStock || isFromWorkOrder}
                                        placeholder={isOutOfStock ? "0" : undefined}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (selectedItem && val > selectedItem.quantity && !isFromWorkOrder) {
                                            toast({
                                              title: "Stock insuficiente",
                                              description: `Solo hay ${selectedItem.quantity} unidades de ${selectedItem.name}.`,
                                              variant: "destructive"
                                            });
                                            field.onChange(selectedItem.quantity);
                                          } else {
                                            field.onChange(e);
                                          }
                                        }}
                                      />
                                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                                        und
                                      </span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {!isFromWorkOrder ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            ) : (
                              <div className="w-10"></div>
                            )}
                          </div>
                          
                          {/* Item Subtotal Line */}
                          {watchItems[index]?.inventoryItemId && (
                            <div className="mt-3 flex justify-between items-center text-sm">
                              <div className={isOutOfStock ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                {isOutOfStock ? "⚠️ Producto sin stock" : `Precio unitario: $${itemPrice.toLocaleString('es-CO')}`}
                              </div>
                              {!isOutOfStock && (
                                <div className="font-medium text-foreground">
                                  Subtotal: ${itemSubtotal.toLocaleString('es-CO')}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                    <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                  </div>
                </div>

                {/* Checkout Section (Payment & Totals) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                  <div className="space-y-4">
                     <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-px bg-border"></span>
                      Pago
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medio de Pago</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-input h-12">
                                <SelectValue placeholder="Selecciona medio de pago" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                              <SelectItem value="DaviPlata">DaviPlata</SelectItem>
                              <SelectItem value="Nequi">Nequi</SelectItem>
                              <SelectItem value="Addi">Addi</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento Especial (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} className="bg-background border-input w-32" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Totals Summary */}
                  <Card className="bg-primary/5 border-primary/20 p-6 flex flex-col justify-center space-y-3 rounded-xl">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Subtotal bruto:</span>
                      <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}</span>
                    </div>
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-red-500 font-medium bg-red-500/10 p-2 rounded-md">
                        <span>Descuento aplicado ({watchDiscount}%):</span>
                        <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(discountAmount)}</span>
                      </div>
                    )}
                    
                    {depositAmountValue > 0 && (
                      <div className="flex justify-between items-center text-sm text-emerald-700 font-medium bg-emerald-500/10 p-2 rounded-md">
                        <span>Abono registrado:</span>
                        <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(depositAmountValue)}</span>
                      </div>
                    )}

                    {depositAmountValue > 0 && remainingBalanceTotal > 0 && (
                      <div className="flex justify-between items-center text-sm text-amber-700 font-medium bg-amber-500/10 p-2 rounded-md">
                        <span>Saldo pendiente (Total - Abono):</span>
                        <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(remainingBalanceTotal)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-primary/20 pt-3 flex justify-between items-end mt-2">
                      <span className="text-base font-semibold text-foreground">Total a Cobrar:</span>
                      <span className="text-3xl font-bold tracking-tight text-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(remainingBalanceTotal)}
                      </span>
                    </div>
                  </Card>
                </div>
                
              </div>
              
              <div className="p-6 border-t border-border/40 bg-muted/10">
                <div className="flex justify-end gap-3">
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="px-6">Cancelar</Button>
                  </DialogTrigger>
                  <Button type="submit" disabled={isSubmitting} className="px-8 shadow-lg shadow-primary/20">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Venta
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {receiptData && (
        <ReceiptDialog
          isOpen={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
          receiptData={receiptData}
        />
      )}
    </>
  );
}

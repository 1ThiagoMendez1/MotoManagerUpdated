"use client";

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, Wrench, PlusCircle, Trash2 } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder, InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createServiceSaleNew } from '@/lib/service-sale-actions';
import { ReceiptDialog } from '@/components/ui/receipt-dialog';

const saleItemSchema = z.object({
    inventoryItemId: z.string().min(1, "Selecciona un producto"),
    sku: z.string().optional(),
    quantity: z.coerce.number().int().min(1, "Mínimo 1"),
    price: z.coerce.number(),
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
});

type AddSaleProps = {
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
};

export function AddSale({ workOrders, inventory }: AddSaleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        workOrderId: '',
        laborCost: 0,
        paymentMethod: 'Efectivo',
        date: new Date(),
        items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { isSubmitting } = form.formState;
  const watchItems = form.watch("items");
  const watchLaborCost = form.watch("laborCost");

  const itemsTotal = watchItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const laborCostValue = watchLaborCost ? parseFloat(String(watchLaborCost)) : 0;
  const total = itemsTotal + laborCostValue;
  
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

    const result = await createServiceSaleNew(null, formData);

    if (result.success && result.sale) {
      toast({
        title: "Éxito",
        description: "Nueva venta registrada correctamente.",
      });
      setIsOpen(false);
      form.reset();

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
        <DialogContent className="sm:max-w-3xl bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Registrar Venta por Servicio</DialogTitle>
          <DialogDescription className="text-black/80">
            Asocia una venta a una orden de trabajo, agrega repuestos y mano de obra.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="workOrderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Orden de Trabajo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                    <FormControl>
                      <SelectTrigger className="bg-white text-black border-black/30">
                        <SelectValue placeholder="Selecciona una orden" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workOrders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.workOrderNumber} - {order.motorcycle.make} {order.motorcycle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
                <FormLabel className="text-black">Repuestos y Productos</FormLabel>
                {fields.map((field, index) => {
                  const currentItem = watchItems?.[index];
                  const selectedItem = inventory.find(item => item.id === currentItem?.inventoryItemId);
                  const isOutOfStock = selectedItem && selectedItem.quantity === 0;
                  const itemPrice = currentItem?.price || 0;
                  const itemQuantity = currentItem?.quantity || 0;
                  const itemSubtotal = itemPrice * itemQuantity;

                  return (
                    <div key={field.id} className="space-y-2">
                      <div className="grid grid-cols-[1fr,2fr,100px,auto] items-start gap-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.sku`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Escanear o escribir SKU" {...field}
                                            className="bg-white text-black border-black/30"
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
                                    <Select onValueChange={(value) => handleProductChange(value, index)} value={selectField.value}>
                                        <FormControl>
                                        <SelectTrigger className={`bg-white border-black/30 ${isOutOfStock ? 'text-red-600 border-red-500' : 'text-black'}`}>
                                            <SelectValue placeholder="Selecciona un producto" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {inventory.map(item => (
                                            <SelectItem
                                                key={item.id}
                                                value={item.id}
                                                disabled={item.quantity === 0}
                                                className={item.quantity === 0 ? 'text-red-600' : ''}
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
                                        <Input
                                            type="number"
                                            {...field}
                                            className={`bg-white border-black/30 ${isOutOfStock ? 'text-red-600 border-red-500 bg-red-50' : 'text-black'}`}
                                            disabled={isOutOfStock}
                                            placeholder={isOutOfStock ? "Sin stock" : undefined}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                          />
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {watchItems?.[index]?.inventoryItemId && (
                        <div className={`text-sm pl-2 border-l-2 ${isOutOfStock ? 'text-red-600 border-red-500' : 'text-black/70 border-black/20'}`}>
                          {isOutOfStock ? (
                            "⚠️ Producto sin stock disponible"
                          ) : (
                            `Precio unitario: $${itemPrice.toLocaleString('es-CO')} × ${itemQuantity} = $${itemSubtotal.toLocaleString('es-CO')}`
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ inventoryItemId: '', sku: '', quantity: 1, price: 0 })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Producto
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                     control={form.control}
                     name="laborCost"
                     render={({ field }) => (
                     <FormItem>
                         <FormLabel className="text-black">Costo Mano de Obra (COP)</FormLabel>
                         <FormControl>
                         <Input type="number" placeholder="120000" {...field} className="bg-white text-black border-black/30" />
                         </FormControl>
                         <FormMessage />
                     </FormItem>
                     )}
                 />
                 <FormField
                     control={form.control}
                     name="paymentMethod"
                     render={({ field }) => (
                     <FormItem>
                         <FormLabel className="text-black">Medio de Pago</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                             <FormControl>
                             <SelectTrigger className="bg-white text-black border-black/30">
                                 <SelectValue placeholder="Selecciona medio de pago" />
                             </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                                 <SelectItem value="DaviPlata">DaviPlata</SelectItem>
                                 <SelectItem value="Nequi">Nequi</SelectItem>
                                 <SelectItem value="Efectivo">Efectivo</SelectItem>
                                 <SelectItem value="Tarjeta">Tarjeta</SelectItem>
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
                 name="date"
                 render={({ field }) => (
                     <FormItem className="flex flex-col">
                     <FormLabel className="text-black">Fecha</FormLabel>
                     <Popover>
                         <PopoverTrigger asChild>
                         <FormControl>
                             <Button
                             variant={"outline"}
                             className={cn(
                                 "pl-3 text-left font-normal bg-white text-black border-black/30 hover:bg-black/10 hover:text-black",
                                 !field.value && "text-muted-foreground"
                             )}
                             >
                             {field.value ? (
                                 format(field.value, "PPP")
                             ) : (
                                 <span>Elige una fecha</span>
                             )}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                             </Button>
                         </FormControl>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                             mode="single"
                             selected={field.value}
                             onSelect={field.onChange}
                             initialFocus
                         />
                         </PopoverContent>
                     </Popover>
                     <FormMessage />
                     </FormItem>
                 )}
                 />
            </div>

             <div className="text-right font-bold text-lg text-black pt-4">
                Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Venta
              </Button>
            </DialogFooter>
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

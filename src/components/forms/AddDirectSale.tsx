"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
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
import type { InventoryItem, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createDirectSaleNew } from '@/lib/direct-sale-actions';
import { ReceiptDialog } from '@/components/ui/receipt-dialog';

const saleItemSchema = z.object({
    inventoryItemId: z.string().min(1, "Selecciona un producto"),
    sku: z.string().optional(),
    quantity: z.coerce.number().int().min(1, "Mínimo 1"),
    price: z.coerce.number(),
});

const formSchema = z.object({
  customerId: z.string().optional(),
  cedula: z.string().optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  paymentMethod: z.enum(['DaviPlata', 'Nequi', 'Efectivo', 'Tarjeta', 'Addi', 'Otros'], {
    required_error: "Se requiere seleccionar un medio de pago.",
  }),
  date: z.date({ required_error: "Se requiere una fecha." }),
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto."),
  discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

type AddDirectSaleProps = {
  inventory: InventoryItem[];
  customers: Customer[];
};

export function AddDirectSale({ inventory, customers }: AddDirectSaleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ inventoryItemId: "", sku: "", quantity: 1, price: 0 }],
      paymentMethod: 'Efectivo',
      date: new Date(),
      cedula: "",
      customerName: "",
      phone: "",
      discountPercentage: 0,
    },
  });

  // Function to find customer by cedula
  const findCustomerByCedula = (cedula: string) => {
    return customers.find(customer => customer.cedula === cedula);
  };

  // Watch cedula field to auto-fill customer info
  const watchCedula = form.watch("cedula");
  useEffect(() => {
    if (watchCedula) {
      const customer = findCustomerByCedula(watchCedula);
      if (customer) {
        form.setValue("customerId", customer.id);
        form.setValue("customerName", customer.name);
        form.setValue("phone", customer.phone || "");
      } else {
        // Clear fields if cedula doesn't match any existing customer
        form.setValue("customerId", "");
        form.setValue("customerName", "");
        form.setValue("phone", "");
      }
    } else {
      // Clear fields if cedula is empty
      form.setValue("customerId", "");
      form.setValue("customerName", "");
      form.setValue("phone", "");
    }
  }, [watchCedula, customers]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { isSubmitting } = form.formState;
  const watchItems = form.watch("items");
  const watchDiscount = form.watch("discountPercentage");

  const subtotal = watchItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * ((watchDiscount || 0) / 100);
  const total = subtotal - discountAmount;
  
  function handleProductChange(value: string, index: number) {
    const selectedProduct = inventory.find(item => item.id === value);
    if (selectedProduct) {
        form.setValue(`items.${index}.price`, selectedProduct.price);
        form.setValue(`items.${index}.inventoryItemId`, selectedProduct.id);
        form.setValue(`items.${index}.sku`, selectedProduct.sku);
    }
  }

  function handleSkuChange(sku: string, index: number) {
    if (!sku.trim()) {
      form.setValue(`items.${index}.inventoryItemId`, '');
      form.setValue(`items.${index}.price`, 0);
      return;
    }
  
    const matches = inventory.filter(item =>
      item.sku.toLowerCase().startsWith(sku.toLowerCase()) ||
      item.name.toLowerCase().includes(sku.toLowerCase())
    );
  
    if (matches.length === 1) {
      const selectedProduct = matches[0];
      form.setValue(`items.${index}.price`, selectedProduct.price);
      form.setValue(`items.${index}.inventoryItemId`, selectedProduct.id, { shouldValidate: true });
      form.setValue(`items.${index}.sku`, selectedProduct.sku);
    } else if (matches.length === 0) {
      form.setValue(`items.${index}.inventoryItemId`, '');
      form.setValue(`items.${index}.price`, 0);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Submitting direct sale with items:', values.items);
    console.log('Form values:', values);

    const formData = new FormData();
    if (values.customerId) formData.append('customerId', values.customerId);
    if (values.cedula) formData.append('cedula', values.cedula);
    if (values.customerName) formData.append('customerName', values.customerName);
    if (values.phone) formData.append('phone', values.phone);
    formData.append('paymentMethod', values.paymentMethod);
    formData.append('date', values.date.toISOString());
    formData.append('items', JSON.stringify(values.items));
    formData.append('discountPercentage', (values.discountPercentage || 0).toString());

    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    console.log('About to call createDirectSaleNew with formData');
    const result = await createDirectSaleNew(null, formData);
    console.log('createDirectSale result:', result);

    if (result.success && result.sale) {
      console.log('✅ Direct sale created successfully');
      toast({
        title: "Éxito",
        description: "Venta directa registrada correctamente.",
      });
      setIsOpen(false);
      form.reset();

      // Show receipt dialog
      setReceiptData(result.sale);
      setReceiptDialogOpen(true);
    } else {
      console.error('❌ Error creating direct sale:', result.message);
      toast({
        title: "Error",
        description: result.message || "Error al registrar la venta directa.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Venta Directa
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Registrar Venta Directa (Mostrador)</DialogTitle>
          <DialogDescription className="text-black/80">
            Vende productos del inventario directamente a un cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                    control={form.control}
                    name="cedula"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-black">Cédula del Cliente</FormLabel>
                            <FormControl>
                                <Input placeholder="Ingresa la cédula" {...field} className="bg-white text-black border-black/30" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-black">Nombre del Cliente</FormLabel>
                            <FormControl>
                                <Input placeholder="Se autocompletará con la cédula" {...field} className="bg-white text-black border-black/30" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-black">Teléfono (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Número de teléfono" {...field} className="bg-white text-black border-black/30" />
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
                            className={cn("pl-3 text-left font-normal bg-white text-black border-black/30 hover:bg-black/10 hover:text-black w-full", !field.value && "text-muted-foreground")}
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
            
            <div className="space-y-2">
                <FormLabel className="text-black">Artículos</FormLabel>
                {fields.map((field, index) => {
                  const currentItem = watchItems?.[index];
                  const selectedItem = inventory.find(item => item.id === currentItem?.inventoryItemId);
                  const isOutOfStock = selectedItem && selectedItem.quantity === 0;
                  const itemPrice = currentItem?.price || 0;
                  const itemQuantity = currentItem?.quantity || 0;
                  const itemSubtotal = itemPrice * itemQuantity;

                  const currentSku = currentItem?.sku || '';
                  const filteredInventory = currentSku
                    ? inventory.filter(item =>
                        item.sku.toLowerCase().startsWith(currentSku.toLowerCase()) ||
                        item.name.toLowerCase().includes(currentSku.toLowerCase())
                      )
                    : inventory;
                  const placeholderText = currentSku && filteredInventory.length === 0 ? "No hay coincidencias" : "Selecciona un producto";

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
                           render={({ field }) => (
                               <FormItem>
                                   <Select onValueChange={(value) => handleProductChange(value, index)} value={field.value}>
                                       <FormControl>
                                       <SelectTrigger className={`bg-white border-black/30 ${isOutOfStock ? 'text-red-600 border-red-500' : 'text-black'}`}>
                                           <SelectValue placeholder={placeholderText} />
                                       </SelectTrigger>
                                       </FormControl>
                                       <SelectContent>
                                       {filteredInventory.map(item => (
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
                                   <FormMessage />
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
                     {watchItems[index]?.inventoryItemId && (
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
                <FormMessage>{form.formState.errors.items?.message}</FormMessage>
            </div>
            
            <div className="space-y-2">
                <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-black">Descuento (%)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="0" {...field} className="bg-white text-black border-black/30" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="text-right space-y-1">
                    <div className="text-sm text-black/70">
                        Subtotal: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}
                    </div>
                    {discountAmount > 0 && (
                        <div className="text-sm text-red-600">
                            Descuento ({watchDiscount}%): -{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(discountAmount)}
                        </div>
                    )}
                    <div className="font-bold text-lg text-black">
                        Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
                    </div>
                </div>
            </div>

            <DialogFooter className='pt-2'>
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

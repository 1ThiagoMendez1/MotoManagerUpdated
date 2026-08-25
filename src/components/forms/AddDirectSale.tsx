"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, PlusCircle, Trash2, ShoppingCart, CreditCard, Banknote } from 'lucide-react';
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
import { createDirectSale } from '@/lib/actions/sales';
import { useRouter } from 'next/navigation';
import { getCustomerByCedula } from '@/lib/actions/customers';
import { ReceiptDialog } from '@/components/ui/receipt-dialog';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

const saleItemSchema = z.object({
  inventoryItemId: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Mínimo 1"),
  price: z.coerce.number(),
}).refine(data => {
  if (data.type === 'service') return !!data.name;
  return !!data.inventoryItemId;
}, { message: "Selecciona un producto o ingresa un servicio", path: ["inventoryItemId"] });

const formSchema = z.object({
  customerId: z.string().optional(),
  cedula: z.string().optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  paymentMethod: z.enum(['Efectivo', 'Nequi', 'DaviPlata', 'Transferencia', 'Tarjeta', 'Otros'], {
    required_error: "Selecciona un medio de pago.",
  }),
  date: z.date({ required_error: "Se requiere una fecha." }),
  items: z.array(saleItemSchema).min(1, "Agrega al menos un producto."),
  discountPercentage: z.coerce.number().min(0).max(100, "El descuento no puede ser mayor al 100%").optional(),
});

type AddDirectSaleProps = {
  inventory: InventoryItem[];
  customers: Customer[];
  services?: any[];
};

export function AddDirectSale({ inventory, customers, services = [] }: AddDirectSaleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ type: 'product', inventoryItemId: "", sku: "", quantity: 1, price: 0 }],
      paymentMethod: 'Efectivo',
      date: new Date(),
      cedula: "",
      customerName: "",
      phone: "",
      discountPercentage: 0,
    },
  });

  const findCustomerByCedula = (cedula: string) => {
    return customers.find(customer => customer.cedula === cedula);
  };

  const watchCedula = form.watch("cedula");
  
  // Keep the automatic local array search as fallback or first check
  useEffect(() => {
    if (watchCedula && watchCedula.length >= 3 && !isSearching) {
      const customer = findCustomerByCedula(watchCedula);
      if (customer) {
        form.setValue("customerId", customer.id);
        form.setValue("customerName", customer.name);
        form.setValue("phone", customer.phone || "");
      }
    }
  }, [watchCedula, customers]);

  const searchCustomer = async () => {
    if (!watchCedula) return;
    setIsSearching(true);
    
    try {
      // Primero buscar en el array local por velocidad
      let customer = findCustomerByCedula(watchCedula);
      
      // Si no está, buscar en base de datos
      if (!customer) {
        const dbCustomer = await getCustomerByCedula(watchCedula);
        if (dbCustomer) {
          customer = dbCustomer as any;
        }
      }

      if (customer) {
        form.setValue("customerId", customer.id);
        form.setValue("customerName", customer.name);
        form.setValue("phone", customer.phone || "");
        toast({
          title: "Cliente encontrado",
          description: `Se cargaron los datos de ${customer.name}.`,
        });
      } else {
        form.setValue("customerId", "");
        toast({
          title: "No encontrado",
          description: "No se encontró cliente con esta cédula. Puedes registrar uno nuevo.",
        });
      }
    } catch (error) {
      console.error("Error buscando cliente:", error);
    } finally {
      setIsSearching(false);
    }
  };

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

  function handleServiceChange(value: string, index: number) {
    const selectedService = services.find(item => item.id === value);
    if (selectedService) {
      form.setValue(`items.${index}.price`, selectedService.default_price || 0);
      form.setValue(`items.${index}.name`, selectedService.name);
      // Also clear search term so it's clean if needed, or leave it
    }
  }

  function handleServiceSearchChange(rawSearchString: string, index: number) {
    if (!rawSearchString.trim()) {
      form.setValue(`items.${index}.name`, '', { shouldValidate: true });
      form.setValue(`items.${index}.price`, 0, { shouldValidate: true });
      return;
    }

    const searchString = rawSearchString.trim().toLowerCase();

    const matches = services.filter(item =>
      item.name.toLowerCase().includes(searchString) ||
      (item.code && item.code.toLowerCase().includes(searchString)) ||
      (item.category && item.category.toLowerCase().includes(searchString))
    );

    // If there is an exact match on the code, or exactly 1 match overall
    const exactCodeMatch = matches.find(item => item.code && item.code.trim().toLowerCase() === searchString);
    const selectedService = exactCodeMatch || (matches.length === 1 ? matches[0] : null);

    if (selectedService) {
      form.setValue(`items.${index}.price`, selectedService.default_price || 0, { shouldValidate: true });
      form.setValue(`items.${index}.name`, selectedService.name, { shouldValidate: true });
      if (selectedService.code) {
        form.setValue(`items.${index}.sku`, selectedService.code, { shouldValidate: true });
      }
    } else if (matches.length === 0) {
      form.setValue(`items.${index}.name`, '', { shouldValidate: true });
      form.setValue(`items.${index}.price`, 0, { shouldValidate: true });
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
    const formData = new FormData();
    if (values.customerId) formData.append('customerId', values.customerId);
    if (values.cedula) formData.append('cedula', values.cedula);
    if (values.customerName) formData.append('customerName', values.customerName);
    if (values.phone) formData.append('phone', values.phone);
    formData.append('paymentMethod', values.paymentMethod);
    formData.append('date', values.date.toISOString());
    formData.append('items', JSON.stringify(values.items));
    formData.append('discountPercentage', (values.discountPercentage || 0).toString());

    const result = await createDirectSale(null, formData);

    if (result.success && result.sale) {
      toast({
        title: "Éxito",
        description: "Venta directa registrada correctamente.",
      });
      setIsOpen(false);
      form.reset();
      router.refresh();
      setReceiptData(result.sale);
      setReceiptDialogOpen(true);
    } else {
      console.error("Direct Sale Error Result:", result);
      toast({
        title: "Error",
        description: result.message || (result.errors ? JSON.stringify(result.errors) : "Error al registrar la venta directa."),
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="shadow-lg hover:shadow-primary/20 transition-all duration-300">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Venta Directa
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl bg-card text-card-foreground border-border/50 shadow-2xl p-0 overflow-hidden">
          <div className="p-6 pb-2 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Registrar Venta Directa
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Vende productos del inventario directamente en el mostrador.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-6 h-px bg-border"></span>
                    Información del Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="cedula"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cédula</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input placeholder="Ingresa la cédula" {...field} className="bg-background border-input focus:ring-primary/20 transition-all" />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon"
                                onClick={searchCustomer}
                                disabled={isSearching || !watchCedula}
                                title="Buscar cliente por cédula"
                              >
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                              </Button>
                            </div>
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
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Automático o nuevo" {...field} className="bg-background border-input focus:ring-primary/20 transition-all" />
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
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="Opcional" {...field} className="bg-background border-input focus:ring-primary/20 transition-all" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-px bg-border"></span>
                      Artículos
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={() => append({ type: 'service', name: '', inventoryItemId: '', sku: '', quantity: 1, price: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Servicio
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={() => append({ type: 'product', inventoryItemId: '', sku: '', quantity: 1, price: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Producto
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
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
                      const placeholderText = currentSku && filteredInventory.length === 0 ? "No coincidencias" : "Selecciona un producto";

                      // For services search, we can use sku field as a temporary search field or a new one. 
                      // Let's use currentSku to store the service search term as well to avoid changing schema.
                      const currentServiceSearch = (currentItem?.sku || '').trim().toLowerCase();
                      const filteredServices = currentServiceSearch
                        ? services.filter(item =>
                            item.name.toLowerCase().includes(currentServiceSearch) ||
                            (item.code && item.code.toLowerCase().includes(currentServiceSearch)) ||
                            (item.category && item.category.toLowerCase().includes(currentServiceSearch))
                          )
                        : services;
                      const servicePlaceholder = currentServiceSearch && filteredServices.length === 0 ? "No coincidencias" : "Selecciona un servicio";

                      return (
                        <Card key={field.id} className="p-3 border-border/50 bg-background/50 hover:bg-muted/10 transition-colors">
                            {currentItem?.type === 'service' ? (
                              <div className="grid grid-cols-[1fr,2fr,120px,auto] items-start gap-4">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.sku`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Buscar servicio..." 
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            handleServiceSearchChange(e.target.value, index);
                                          }}
                                          className="bg-background border-input focus:ring-primary/20"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select 
                                        onValueChange={(val) => {
                                          if (val !== 'custom') {
                                            handleServiceChange(val, index);
                                          }
                                        }}
                                        value={services.some(s => s.name === field.value) ? services.find(s => s.name === field.value)?.id : (field.value ? 'custom' : '')}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="bg-background border-input">
                                            <SelectValue placeholder={servicePlaceholder} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {filteredServices.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                              {item.name} - ${item.default_price?.toLocaleString('es-CO') || 0}
                                            </SelectItem>
                                          ))}
                                          {field.value && !services.some(s => s.name === field.value) && (
                                            <SelectItem value="custom">{field.value} (Personalizado)</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="relative">
                                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                          <Input
                                            type="number"
                                            placeholder="Precio" {...field}
                                            className="bg-background border-input focus:ring-primary/20 pl-7"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            ) : (
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
                                          <SelectTrigger className={`bg-background border-input ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''}`}>
                                            <SelectValue placeholder={placeholderText} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {filteredInventory.map(item => (
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
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            {...field}
                                            min={1}
                                            max={selectedItem?.quantity || 9999}
                                            className={`bg-background border-input pr-8 ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''}`}
                                            disabled={isOutOfStock}
                                            placeholder={isOutOfStock ? "0" : undefined}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value);
                                              if (selectedItem && val > selectedItem.quantity) {
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
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            )}
                          
                          {/* Item Subtotal Line */}
                          {(watchItems[index]?.inventoryItemId || watchItems[index]?.type === 'service') && (
                            <div className="mt-3 flex justify-between items-center text-sm">
                              <div className={isOutOfStock && watchItems[index]?.type !== 'service' ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                {isOutOfStock && watchItems[index]?.type !== 'service' ? "⚠️ Producto sin stock" : `Precio unitario: $${itemPrice.toLocaleString('es-CO')}`}
                              </div>
                              {(!isOutOfStock || watchItems[index]?.type === 'service') && (
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
                          <FormLabel>Método de Pago</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-input h-12">
                                <SelectValue placeholder="Selecciona el medio de pago" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Efectivo">
                                <div className="flex items-center gap-2">
                                  <Banknote className="w-4 h-4 text-green-500" />
                                  <span>Efectivo</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Nequi">
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded bg-[#FF0077] inline-block" />
                                  <span>Nequi</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="DaviPlata">
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded bg-red-600 inline-block" />
                                  <span>DaviPlata</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Transferencia">
                                <div className="flex items-center gap-2">
                                  <Banknote className="w-4 h-4 text-blue-500" />
                                  <span>Transferencia Bancaria</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Tarjeta">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-purple-500" />
                                  <span>Tarjeta Crédito/Débito</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Otros">
                                <div className="flex items-center gap-2">
                                  <Banknote className="w-4 h-4 text-gray-500" />
                                  <span>Otros</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Registro interno del método de pago utilizado.
                          </p>
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
                    
                    <div className="border-t border-primary/20 pt-3 flex justify-between items-end mt-2">
                      <span className="text-base font-semibold text-foreground">Total a Cobrar:</span>
                      <span className="text-3xl font-bold tracking-tight text-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
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
                  <Button type="submit" disabled={isSubmitting || watchItems.length === 0} className="px-8 shadow-lg shadow-primary/20">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Pagar
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

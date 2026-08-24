"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingCart, PlusCircle, Trash2, Loader2, PackageSearch, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useToast } from '@/hooks/use-toast';
import { createPurchase } from '@/lib/actions/purchases';
import { useRouter } from 'next/navigation';
import type { InventoryItem } from '@/lib/types';


const purchaseItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Selecciona un repuesto"),
  name: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Debe ingresar al menos 1 unidad"),
  unitCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
});

const formSchema = z.object({
  invoiceNumber: z.string().optional(),
  supplierId: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Debe agregar al menos un repuesto a la factura"),
});

interface AddPurchaseProps {
  inventory: InventoryItem[];
}


function InventoryCombobox({ inventory, value, onSelect }: { inventory: any[], value: string, onSelect: (val: string, name: string, cost: number) => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal text-left truncate px-3 bg-card border-border",
              !value && "text-muted-foreground"
            )}
          >
            {value
              ? (() => {
                  const selected = inventory.find(i => i.id === value);
                  return selected ? `${selected.sku} - ${selected.name}` : "Repuesto seleccionado";
                })()
              : "Buscar repuesto..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nombre o SKU..." />
          <CommandList>
            <CommandEmpty>No se encontraron repuestos.</CommandEmpty>
            <CommandGroup>
              {inventory.map((item) => (
                <CommandItem
                  value={`${item.sku} ${item.name}`}
                  key={item.id}
                  onSelect={() => {
                    const defaultCost = item.lastCost || item.supplierPrice || 0;
                    onSelect(item.id, item.name, defaultCost);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      item.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.sku} - {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AddPurchase({ inventory }: AddPurchaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: '',
      supplierId: '',
      items: [{ inventoryItemId: '', name: '', quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");

  const total = watchItems.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const c = Number(item.unitCost) || 0;
    return sum + (q * c);
  }, 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(values));
      
      const result = await createPurchase(null, formData);
      
      if (result?.message) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      } else if (result?.errors) {
        toast({
          title: "Error de validación",
          description: "Revisa los campos del formulario.",
          variant: "destructive",
        });
      } else if (result?.success) {
        toast({
          title: "Éxito",
          description: "Factura registrada y stock actualizado en Bodega.",
        });
        setIsOpen(false);
        form.reset();
        router.refresh();
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Error inesperado al conectar con el servidor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Registrar Compra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Registrar Factura de Compra (Abastecimiento)</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ingresa los repuestos que compraste. Esto aumentará automáticamente el stock en Bodega y creará el gasto contable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border/50 rounded-lg bg-muted/10">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nro. de Factura / Recibo (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: FAC-10293" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor o ID..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Repuestos (Ítems de la Factura)</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => append({ inventoryItemId: '', name: '', quantity: 1, unitCost: 0 })}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Añadir Fila
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.map((field, index) => {
                  return (
                    <div key={field.id} className="grid grid-cols-[1fr_120px_150px_40px] gap-3 items-start border border-border/50 p-3 rounded-lg bg-background">
                      <FormField
                        control={form.control}
                        name={`items.${index}.inventoryItemId`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormControl>
                              <InventoryCombobox 
                                inventory={inventory.filter(i => i.trackInventory !== false)} 
                                value={itemField.value}
                                onSelect={(id, name, cost) => {
                                  itemField.onChange(id);
                                  form.setValue(`items.${index}.name`, name);
                                  form.setValue(`items.${index}.unitCost`, cost);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: qField }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" min="1" placeholder="Cant." {...qField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        render={({ field: cField }) => (
                          <FormItem>
                            <FormControl>
                              <CurrencyInput placeholder="Costo Unit." {...cField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-muted/20 border border-border/50 rounded-lg">
              <span className="font-medium text-muted-foreground">Total Factura:</span>
              <span className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
              </span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || watchItems.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar e Ingresar Stock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

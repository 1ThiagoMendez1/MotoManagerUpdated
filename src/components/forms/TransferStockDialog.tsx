"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { transferStock } from '@/lib/actions/inventory';
import type { InventoryItem } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Cantidad debe ser mayor a 0"),
  destination: z.enum(['warehouse', 'storefront']),
});

export function TransferStockDialog({ 
  item, 
  currentLocation = 'warehouse' 
}: { 
  item: InventoryItem;
  currentLocation?: 'warehouse' | 'storefront';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const bodegaStock = item.stockDetails?.find(s => s.type === 'warehouse');
  const vitrinaStock = item.stockDetails?.find(s => s.type === 'storefront');

  const defaultDestination = currentLocation === 'warehouse' ? 'storefront' : 'warehouse';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      destination: defaultDestination,
    },
  });

  const watchDestination = form.watch("destination");
  const originType = watchDestination === 'warehouse' ? 'storefront' : 'warehouse';
  
  const originStock = originType === 'warehouse' ? bodegaStock : vitrinaStock;
  const destinationStock = watchDestination === 'warehouse' ? bodegaStock : vitrinaStock;
  
  const hasOriginStock = originStock && originStock.quantity > 0;
  const maxQuantity = originStock?.quantity || 1;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        quantity: 1,
        destination: defaultDestination,
      });
    }
  }, [isOpen, form, defaultDestination]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!originStock || originStock.quantity <= 0) {
          toast({ title: "Error", description: `No hay stock en el origen para trasladar.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
      }
      if (values.quantity > originStock.quantity) {
          toast({ title: "Error", description: "No hay suficiente stock en el origen.", variant: "destructive" });
          setIsSubmitting(false);
          return;
      }
      
      const formData = new FormData();
      formData.append('itemId', item.id);
      formData.append('fromLocationId', originStock.locationId);
      // Si no hay stock previo en destino, enviamos el tipo
      formData.append('toLocationId', destinationStock?.locationId || watchDestination);
      formData.append('quantity', values.quantity.toString());
      
      const result = await transferStock(null, formData);
      
      if (result?.message) {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Éxito", description: "Stock trasladado correctamente." });
        setIsOpen(false);
        form.reset();
        router.refresh();
      }
    } catch (e) {
      toast({ title: "Error", description: "Error de servidor.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (item.trackInventory === false) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Trasladar Stock">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Trasladar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Trasladar Stock</DialogTitle>
          <DialogDescription>
            Mueve repuestos entre la <b>Bodega</b> y la <b>Vitrina</b> para {item.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex justify-between items-center text-sm border-y border-border/50 bg-muted/10 px-4 -mx-6 mb-4">
            <div className="text-center">
                <p className="text-muted-foreground mb-1">Bodega Actual</p>
                <p className="font-bold text-lg">{bodegaStock?.quantity || 0}</p>
            </div>
            <ArrowRightLeft className="w-6 h-6 text-muted-foreground opacity-50" />
            <div className="text-center">
                <p className="text-muted-foreground mb-1">Vitrina Actual</p>
                <p className="font-bold text-lg">{vitrinaStock?.quantity || 0}</p>
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="storefront">Vitrina (Comercial)</SelectItem>
                      <SelectItem value="warehouse">Bodega Principal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad a trasladar (máx. {maxQuantity})</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max={maxQuantity} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !hasOriginStock}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Traslado
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { bulkTransferStock } from '@/lib/actions/inventory';
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
  destination: z.enum(['warehouse', 'storefront']),
});

export function BulkTransferDialog({ 
  selectedItemIds,
  inventory,
  currentLocation,
  onSuccess
}: { 
  selectedItemIds: string[];
  inventory: InventoryItem[];
  currentLocation: 'warehouse' | 'storefront';
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const defaultDestination = currentLocation === 'warehouse' ? 'storefront' : 'warehouse';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: defaultDestination,
    },
  });

  const watchDestination = form.watch("destination");
  const originType = watchDestination === 'warehouse' ? 'storefront' : 'warehouse';
  
  // Calculate how many items can actually be transferred
  const transferData = selectedItemIds.map(id => {
    const item = inventory.find(i => i.id === id);
    if (!item) return null;
    
    const originStock = item.stockDetails?.find(s => s.type === originType);
    const destStock = item.stockDetails?.find(s => s.type === watchDestination);
    
    const hasOrigin = originStock && originStock.quantity > 0;
    const hasDest = destStock && destStock.quantity > 0;
    
    // Regla de negocio: Solo permitir si está exclusivamente en el origen.
    // Si ya tiene stock en ambos lugares, no se permite el traslado masivo para correcciones.
    const isExclusivelyInOrigin = hasOrigin && !hasDest;

    return {
      itemId: id,
      name: item.name,
      originLocId: originStock?.locationId,
      maxQuantity: originStock?.quantity || 0,
      isExclusivelyInOrigin,
      hasOrigin,
      hasDest
    };
  }).filter(Boolean) as { itemId: string, name: string, originLocId: string, maxQuantity: number, isExclusivelyInOrigin: boolean, hasOrigin: boolean, hasDest: boolean }[];

  const validTransferItems = transferData.filter(d => d.isExclusivelyInOrigin && d.originLocId);
  const invalidBecauseBoth = transferData.filter(d => d.hasOrigin && d.hasDest);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        destination: defaultDestination,
      });
    }
  }, [isOpen, form, defaultDestination]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (validTransferItems.length === 0) {
          toast({ title: "Aviso", description: "No hay items válidos para trasladar masivamente con estas condiciones.", variant: "destructive" });
          setIsSubmitting(false);
          return;
      }
      
      const itemsPayload = validTransferItems.map(item => ({
        itemId: item.itemId,
        fromLocId: item.originLocId,
        quantity: item.maxQuantity
      }));

      const formData = new FormData();
      formData.append('items', JSON.stringify(itemsPayload));
      formData.append('toLocationType', values.destination);
      
      const result = await bulkTransferStock(null, formData);
      
      if (result?.message) {
        toast({ title: "Resultado parcial/Error", description: result.message, variant: result.success ? "default" : "destructive" });
      } else {
        toast({ title: "Éxito", description: "Corrección de ubicación (traslado) completada." });
      }

      setIsOpen(false);
      form.reset();
      router.refresh();
      if (onSuccess) onSuccess();

    } catch (e) {
      toast({ title: "Error", description: "Error de servidor.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="ml-4">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Mover {selectedItemIds.length} items
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Mover Mercancía (Corrección)</DialogTitle>
          <DialogDescription>
            Solo se permite mover en bloque los productos que <b>estén en un único lugar</b> y te hayas equivocado de destino al crearlos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Destino</FormLabel>
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

            <div className="bg-muted/30 p-3 rounded-md border border-border/50 text-sm">
              <div className="flex items-center gap-2 mb-2 font-medium">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                Resumen de operación
              </div>
              <ul className="space-y-1 text-muted-foreground">
                <li>Items seleccionados: {selectedItemIds.length}</li>
                <li>Items válidos para mover: <span className="font-bold text-foreground">{validTransferItems.length}</span></li>
                
                {invalidBecauseBoth.length > 0 && (
                  <li className="text-destructive font-medium mt-2">
                    {invalidBecauseBoth.length} item(s) ignorado(s) porque ya tienen stock tanto en Vitrina como en Bodega. (Usa el traslado individual).
                  </li>
                )}
                
                {validTransferItems.length === 0 && invalidBecauseBoth.length === 0 && (
                  <li className="text-destructive font-medium mt-2">
                    Ninguno de los items tiene stock en el origen actual.
                  </li>
                )}
              </ul>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || validTransferItems.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Loader2, Edit } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useToast } from '@/hooks/use-toast';
import { updateInventoryItem } from '@/lib/actions/inventory';
import type { InventoryItem, InventoryCategory } from '@/lib/types';

const inventoryCategories: InventoryCategory[] = ['Repuestos', 'Lubricantes', 'Llantas', 'Accesorios', 'Aceites'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
      {pending ? 'Actualizando...' : 'Actualizar Artículo'}
    </Button>
  );
}

interface EditInventoryItemProps {
  item: InventoryItem;
}

export function EditInventoryItem({ item }: EditInventoryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  // @ts-ignore
  const [state, formAction] = useActionState(updateInventoryItem, undefined);
  const [trackInventory, setTrackInventory] = useState(item.trackInventory !== false);

  useEffect(() => {
    if (isOpen) {
      setTrackInventory(item.trackInventory !== false);
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
    if (state?.errors) {
      const errorMessages = Object.values(state.errors).flat().join(', ');
      toast({
        title: "Error de validación",
        description: errorMessages,
        variant: "destructive",
      });
    }
  }, [state?.message, state?.errors, toast]);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Éxito",
        description: "Artículo actualizado correctamente.",
      });
      setIsOpen(false);
      router.refresh();
    }
  }, [state?.success, toast, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-green-500 text-foreground hover:bg-green-600">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Artículo del Inventario</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Modifica los detalles del artículo seleccionado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={item.id} />
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre del Artículo</label>
              <Input name="name" defaultValue={item.name} placeholder="p. ej., Filtro de Aceite" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">SKU</label>
              <Input name="sku" defaultValue={item.sku} placeholder="p. ej., HF-145" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Switch id={`trackInventory-${item.id}`} name="trackInventory" checked={trackInventory} onCheckedChange={(checked) => {
              setTrackInventory(checked);
              const el = document.getElementById(`track-inventory-input-${item.id}`) as HTMLInputElement;
              if (el) el.value = checked ? 'true' : 'false';
            }} />
            <label htmlFor={`trackInventory-${item.id}`} className="text-sm font-medium text-foreground cursor-pointer">
              Controlar Stock (Desmarcar para compras directas o sin stock fijo)
            </label>
            <input type="hidden" id={`track-inventory-input-${item.id}`} name="trackInventoryVal" value={trackInventory ? 'true' : 'false'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select name="category" defaultValue={item.category}>
                <SelectTrigger className="bg-card text-card-foreground border-border">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Venta (COP)</label>
              <CurrencyInput name="price" defaultValue={item.price} placeholder="35000" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Proveedor (Opcional)</label>
              <Input name="supplier" defaultValue={item.supplier} placeholder="p. ej., RepuestosExpress" className="bg-card text-card-foreground border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Último Costo / Precio Compra (COP)</label>
              <CurrencyInput name="supplierPrice" defaultValue={item.lastCost || item.supplierPrice} placeholder="22000" className="bg-card text-card-foreground border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad (Total actual: {item.quantity})</label>
              <Input 
                name="quantity" 
                type="number" 
                min="0"
                defaultValue={item.quantity} 
                placeholder="25" 
                className="bg-card text-card-foreground border-border" 
                disabled={!trackInventory} 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-card text-card-foreground border-border" />
            </div>
          </div>
          
          <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Ubicación Física Específica</label>
              <Input name="location" defaultValue={item.location} placeholder="p. ej., Estante 2, Fila B" className="bg-card text-card-foreground border-border" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
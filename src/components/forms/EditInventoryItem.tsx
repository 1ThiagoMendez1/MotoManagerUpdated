"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { updateInventoryItem } from '@/lib/actions';
import type { InventoryItem, InventoryCategory } from '@/lib/types';

const inventoryCategories: InventoryCategory[] = ['Repuestos', 'Lubricantes', 'Llantas', 'Accesorios'];

function SubmitButton() {
  return (
    <Button type="submit">
      <Edit className="mr-2 h-4 w-4" />
      Actualizar Artículo
    </Button>
  );
}

interface EditInventoryItemProps {
  item: InventoryItem;
}

export function EditInventoryItem({ item }: EditInventoryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  // @ts-ignore
  const [state, formAction] = useActionState(updateInventoryItem, undefined);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
      setIsOpen(false);
    }
    if (state?.errors) {
      const errorMessages = Object.values(state.errors).flat().join(', ');
      toast({
        title: "Error de validación",
        description: errorMessages,
        variant: "destructive",
      });
      setIsOpen(false);
    }
  }, [state?.message, state?.errors, toast]);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Éxito",
        description: "Artículo actualizado correctamente.",
      });
      setIsOpen(false);
    }
  }, [state?.success, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Editar Artículo del Inventario</DialogTitle>
          <DialogDescription className="text-black/80">
            Modifica los detalles del artículo seleccionado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={item.id} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Nombre del Artículo</label>
              <Input name="name" defaultValue={item.name} placeholder="p. ej., Filtro de Aceite" className="bg-white text-black border-black/30" required />
            </div>
            <div>
              <label className="text-sm font-medium text-black">SKU</label>
              <Input name="sku" defaultValue={item.sku} placeholder="p. ej., HF-145" className="bg-white text-black border-black/30" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Categoría</label>
              <Select name="category" defaultValue={item.category}>
                <SelectTrigger className="bg-white text-black border-black/30">
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
              <label className="text-sm font-medium text-black">Ubicación</label>
              <Input name="location" defaultValue={item.location} placeholder="p. ej., Estante A-1" className="bg-white text-black border-black/30" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Proveedor</label>
              <Input name="supplier" defaultValue={item.supplier} placeholder="p. ej., RepuestosExpress" className="bg-white text-black border-black/30" required />
            </div>
            <div>
              <label className="text-sm font-medium text-black">Precio Proveedor (COP)</label>
              <Input name="supplierPrice" type="number" defaultValue={item.supplierPrice} placeholder="22000" className="bg-white text-black border-black/30" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-black">Cantidad</label>
                <Input name="quantity" type="number" defaultValue={item.quantity} placeholder="25" className="bg-white text-black border-black/30" required />
              </div>
              <div>
                <label className="text-sm font-medium text-black">Precio Venta (COP)</label>
                <Input name="price" type="number" defaultValue={item.price} placeholder="35000" className="bg-white text-black border-black/30" required />
              </div>
              <div>
                <label className="text-sm font-medium text-black">Cantidad Mínima</label>
                <Input name="minimumQuantity" type="number" defaultValue={item.minimumQuantity} placeholder="10" className="bg-white text-black border-black/30" required />
              </div>
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, PlusCircle } from 'lucide-react';
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
import { createInventoryItem } from '@/lib/actions';
import type { InventoryCategory } from '@/lib/types';

const inventoryCategories: InventoryCategory[] = ['Repuestos', 'Lubricantes', 'Llantas', 'Accesorios'];

function SubmitButton() {
  return (
    <Button type="submit">
      <PlusCircle className="mr-2 h-4 w-4" />
      Agregar Artículo
    </Button>
  );
}

export function AddInventoryItem() {
  const [isOpen, setIsOpen] = useState(false);
  // @ts-ignore
  const [state, formAction] = useActionState(createInventoryItem, undefined);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      console.log('✅ Inventory item created successfully in frontend');
    } else if (state?.message) {
      console.error('❌ Error creating inventory item:', state.message);
    } else if (state?.errors) {
      console.error('❌ Validation errors:', state.errors);
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Artículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Agregar Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription className="text-black/80">
            Completa los detalles para agregar un nuevo repuesto o suministro.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Nombre del Artículo</label>
              <Input name="name" placeholder="p. ej., Filtro de Aceite" className="bg-white text-black border-black/30" required />
            </div>
            <div>
              <label className="text-sm font-medium text-black">SKU</label>
              <Input name="sku" placeholder="p. ej., HF-145" className="bg-white text-black border-black/30" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Categoría</label>
              <Select name="category">
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
              <Input name="location" placeholder="p. ej., Estante A-1" className="bg-white text-black border-black/30" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-black">Proveedor</label>
              <Input name="supplier" placeholder="p. ej., RepuestosExpress" className="bg-white text-black border-black/30" required />
            </div>
            <div>
              <label className="text-sm font-medium text-black">Precio Proveedor (COP)</label>
              <Input name="supplierPrice" type="number" placeholder="22000" className="bg-white text-black border-black/30" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-black">Cantidad</label>
                <Input name="quantity" type="number" placeholder="25" className="bg-white text-black border-black/30" required />
              </div>
              <div>
                <label className="text-sm font-medium text-black">Precio Venta (COP)</label>
                <Input name="price" type="number" placeholder="35000" className="bg-white text-black border-black/30" required />
              </div>
              <div>
                <label className="text-sm font-medium text-black">Cantidad Mínima</label>
                <Input name="minimumQuantity" type="number" placeholder="10" className="bg-white text-black border-black/30" required />
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

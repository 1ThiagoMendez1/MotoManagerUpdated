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
import { CurrencyInput } from '@/components/ui/currency-input';
import { createInventoryItem } from '@/lib/actions/inventory';
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
      <DialogContent className="sm:max-w-xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para agregar un nuevo repuesto o suministro.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre del Artículo</label>
              <Input name="name" placeholder="p. ej., Filtro de Aceite" className="bg-card text-card-foreground border-border" required />
              {state?.errors?.name && (
                <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">SKU</label>
              <Input name="sku" placeholder="p. ej., HF-145" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select name="category">
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
              <label className="text-sm font-medium text-foreground">Ubicación</label>
              <Input name="location" placeholder="p. ej., Estante A-1" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Proveedor</label>
              <Input name="supplier" placeholder="p. ej., RepuestosExpress" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Proveedor (COP)</label>
              <CurrencyInput name="supplierPrice" placeholder="22000" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad</label>
              <Input name="quantity" type="number" placeholder="25" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Precio Venta (COP)</label>
              <CurrencyInput name="price" placeholder="35000" className="bg-card text-card-foreground border-border" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cantidad Mínima</label>
              <Input name="minimumQuantity" type="number" placeholder="10" className="bg-card text-card-foreground border-border" required />
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

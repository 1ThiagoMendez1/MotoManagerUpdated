"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { createInventoryItem } from '@/lib/actions/inventory';
import type { InventoryCategory } from '@/lib/types';

const inventoryCategories: InventoryCategory[] = ['Repuestos', 'Lubricantes', 'Llantas', 'Accesorios', 'Aceites'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      {pending ? 'Guardando...' : 'Agregar Artículo'}
    </Button>
  );
}

export function AddInventoryItem() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  // @ts-ignore
  const [state, formAction] = useActionState(createInventoryItem, undefined);

  useEffect(() => {
    if (state?.success) {
      console.log('Se agregó un nuevo artículo al inventario');
      setIsOpen(false);
      toast({ title: 'Artículo agregado', description: 'El artículo ha sido guardado exitosamente.' });
      router.refresh();
    } else if (state?.message) {
      toast({ title: 'Error', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

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

          <div className="flex items-center space-x-2 py-2">
            <Switch id="trackInventory" name="trackInventory" defaultChecked={true} onCheckedChange={(checked) => {
              const el = document.getElementById('track-inventory-input') as HTMLInputElement;
              if (el) el.value = checked ? 'true' : 'false';
              // Force state update to re-render optional fields
              const event = new Event('change', { bubbles: true });
              el?.dispatchEvent(event);
            }} />
            <label htmlFor="trackInventory" className="text-sm font-medium text-foreground cursor-pointer">
              Controlar Stock (Desmarcar para compras directas o sin stock fijo)
            </label>
            <input type="hidden" id="track-inventory-input" name="trackInventoryVal" defaultValue="true" />
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
              <label className="text-sm font-medium text-foreground">Precio Venta (COP)</label>
              <CurrencyInput name="price" placeholder="35000" className="bg-card text-card-foreground border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Proveedor (Opcional)</label>
              <Input name="supplier" placeholder="p. ej., RepuestosExpress" className="bg-card text-card-foreground border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Último Costo / Precio Compra (COP)</label>
              <CurrencyInput name="supplierPrice" placeholder="22000" className="bg-card text-card-foreground border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Lugar (Destino Inicial)</label>
              <input type="hidden" id="destination-input" name="destination" defaultValue="storefront" />
              <RadioGroup defaultValue="storefront" onValueChange={(val) => { 
                const el = document.getElementById('destination-input') as HTMLInputElement | null;
                if (el) el.value = val;
              }} className="flex flex-col space-y-1 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="storefront" id="add-storefront" />
                  <label htmlFor="add-storefront" className="text-sm font-medium leading-none cursor-pointer">
                    Directo a <b>Vitrina</b>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="warehouse" id="add-warehouse" />
                  <label htmlFor="add-warehouse" className="text-sm font-medium leading-none cursor-pointer">
                    Directo a <b>Bodega</b>
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Inicial</label>
                <Input name="quantity" type="number" placeholder="25" className="bg-card text-card-foreground border-border" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground text-muted-foreground">Ubicación Física Específica</label>
                <Input name="location" placeholder="p. ej., Estante 2, Fila B" className="bg-card text-card-foreground border-border" />
              </div>
            </div>
          </div>
          
          <div>
              <label className="text-sm font-medium text-foreground text-muted-foreground">Cantidad Mínima de Alerta</label>
              <Input name="minimumQuantity" type="number" placeholder="10" className="bg-card text-card-foreground border-border w-1/2" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

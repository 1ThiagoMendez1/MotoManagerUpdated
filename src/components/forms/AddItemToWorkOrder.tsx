"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addItemToWorkOrder } from '@/lib/actions/work-orders';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddItemToWorkOrderProps {
  workOrderId: string;
  inventory: { id: string; name: string; sku: string; quantity: number }[];
}

export function AddItemToWorkOrder({ workOrderId, inventory }: AddItemToWorkOrderProps) {
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  // Filter inventory based on search term
  const filteredInventory = searchTerm
    ? inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : inventory;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un artículo del inventario.",
        variant: "destructive"
      });
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una cantidad válida mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append('workOrderId', workOrderId);
      formData.append('inventoryItemId', selectedItem);
      formData.append('quantity', quantity.toString());

      const result = await addItemToWorkOrder(formData);
      if (result && !result.success) {
        toast({
          title: "Error al agregar artículo",
          description: result.error || "No se pudo agregar el repuesto a la orden.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Artículo agregado",
          description: "El repuesto se agregó correctamente a la orden.",
        });
        setSelectedItem('');
        setQuantity('');
        setSearchTerm('');
      }
    } catch (error: any) {
      console.error("Error al agregar repuesto:", error);
      toast({
        title: "Error de red",
        description: "No se pudo conectar con el servidor para agregar el repuesto.",
        variant: "destructive"
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-card/50 text-foreground border border-border/50 rounded-md p-2 w-full sm:w-64"
        />
        <Select
          value={selectedItem}
          onValueChange={setSelectedItem}
          disabled={isPending}
        >
          <SelectTrigger className="bg-background text-foreground border border-border/50 rounded-md flex-1 min-w-[200px]">
            <SelectValue placeholder="Seleccionar artículo" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border border-border/50">
            {filteredInventory.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                className="text-foreground focus:bg-accent focus:text-accent-foreground"
              >
                {item.name} - {item.sku} (Disp: {item.quantity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="number"
          name="quantity"
          value={quantity}
          disabled={isPending}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              setQuantity('');
              return;
            }
            const numVal = Number(val);
            const selectedInvItem = inventory.find(i => i.id === selectedItem);
            
            if (selectedInvItem && numVal > selectedInvItem.quantity) {
              toast({
                title: "Stock insuficiente",
                description: `Solo hay ${selectedInvItem.quantity} unidades disponibles de este repuesto.`,
                variant: "destructive"
              });
              setQuantity(selectedInvItem.quantity);
            } else {
              setQuantity(numVal);
            }
          }}
          min={1}
          placeholder="Cant"
          className="w-full sm:w-24 bg-card/50 text-foreground border border-border/50 rounded-md p-2"
        />
      </div>
      <div className="flex justify-end mt-2">
        <Button 
          type="submit" 
          className="bg-green-600 hover:bg-green-700"
          disabled={isPending || !selectedItem || !quantity}
        >
          {isPending ? "Agregando..." : "Agregar"}
        </Button>
      </div>
    </form>
  );
}
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
  const { toast } = useToast();

  // Filter inventory based on search term
  const filteredInventory = searchTerm
    ? inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : inventory;

  return (
    <form action={addItemToWorkOrder} className="flex flex-col gap-4 mb-4">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="inventoryItemId" value={selectedItem} />
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
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          Agregar
        </Button>
      </div>
    </form>
  );
}
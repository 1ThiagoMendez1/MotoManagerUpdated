"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addItemToWorkOrder } from '@/lib/work-order-actions';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddItemToWorkOrderProps {
  workOrderId: string;
  inventory: { id: string; name: string; sku: string }[];
}

export function AddItemToWorkOrder({ workOrderId, inventory }: AddItemToWorkOrderProps) {
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white/10 text-white border border-white/20 rounded-md p-2 w-full sm:w-64"
        />
        <Select
          value={selectedItem}
          onValueChange={setSelectedItem}
        >
          <SelectTrigger className="bg-white/10 text-white border border-white/20 rounded-md flex-1 min-w-[200px]">
            <SelectValue placeholder="Seleccionar artículo" />
          </SelectTrigger>
          <SelectContent className="bg-black/70 text-white backdrop-blur-md border border-white/20">
            {filteredInventory.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                className="text-white focus:bg-white/10 focus:text-white"
              >
                {item.name} - {item.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="number"
          name="quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          min={1}
          className="w-20 bg-white/10 text-white border border-white/20 rounded-md p-2"
        />
        <Button type="submit" className="bg-green-600 hover:bg-green-700">
          Agregar
        </Button>
      </div>
    </form>
  );
}
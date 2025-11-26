"use client";

import { Button } from '@/components/ui/button';
import { removeItemFromWorkOrder } from '@/lib/work-order-actions';

interface RemoveItemFromWorkOrderProps {
  workOrderId: string;
  saleItemId: string;
}

export function RemoveItemFromWorkOrder({ workOrderId, saleItemId }: RemoveItemFromWorkOrderProps) {
  return (
    <form action={removeItemFromWorkOrder}>
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="saleItemId" value={saleItemId} />
      <Button type="submit" variant="destructive" size="sm">
        Eliminar
      </Button>
    </form>
  );
}
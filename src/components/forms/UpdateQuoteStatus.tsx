"use client";

import { useState, useTransition } from 'react';
import { useActionState } from 'react';
import { updateQuoteStatus } from '@/lib/actions/work-orders';
import type { WorkOrder } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UpdateQuoteStatusProps {
  workOrder: WorkOrder;
}

export function UpdateQuoteStatus({ workOrder }: UpdateQuoteStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(
    workOrder.quoteStatus || 'Pendiente'
  );
  const [isPending, startTransition] = useTransition();
  
  // @ts-ignore
  const [state, formAction] = useActionState(updateQuoteStatus, undefined);

  const statusOptions = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Aprobada', label: 'Aprobada' },
    { value: 'Rechazada', label: 'Rechazada' },
  ];

  const handleValueChange = (value: string) => {
    setSelectedStatus(value);
    
    // Create FormData for the server action
    const formData = new FormData();
    formData.append('id', workOrder.id);
    formData.append('quoteStatus', value);
    
    startTransition(() => {
      // @ts-ignore
      formAction(formData);
    });
  };

  const getVariantStyles = (status: string) => {
    switch (status) {
      case 'Aprobada':
        return 'text-green-500 focus:ring-green-500/20';
      case 'Rechazada':
        return 'text-red-500 focus:ring-red-500/20';
      default:
        return 'text-yellow-500 focus:ring-yellow-500/20';
    }
  };

  return (
    <div className="w-[120px]">
      <form>
        <Select value={selectedStatus} onValueChange={handleValueChange}>
          <SelectTrigger className={`h-8 border-border/50 bg-card/50 ${getVariantStyles(selectedStatus)}`}>
            <SelectValue placeholder="Cotización" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
    </div>
  );
}

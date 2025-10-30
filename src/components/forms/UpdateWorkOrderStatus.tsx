"use client";

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, CheckCircle } from 'lucide-react';
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
import { updateWorkOrderStatus } from '@/lib/actions';
import type { WorkOrder } from '@/lib/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <CheckCircle className="mr-2 h-4 w-4" />
      Actualizar Estado
    </Button>
  );
}

interface UpdateWorkOrderStatusProps {
  workOrder: WorkOrder;
}

export function UpdateWorkOrderStatus({ workOrder }: UpdateWorkOrderStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(workOrder.status);
  // @ts-ignore
  const [state, formAction] = useActionState(updateWorkOrderStatus, undefined);

  const statusOptions = [
    { value: 'Diagnosticando', label: 'Diagnosticando' },
    { value: 'Reparado', label: 'Reparado' },
    { value: 'Entregado', label: 'Entregado' },
  ];

  const handleSubmit = (formData: FormData) => {
    formData.append('id', workOrder.id);
    formData.append('status', selectedStatus);
    // @ts-ignore
    formAction(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          Cambiar Estado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Actualizar Estado de Orden</DialogTitle>
          <DialogDescription className="text-black/80">
            Cambia el estado de la orden de trabajo para {workOrder.motorcycle.make} {workOrder.motorcycle.model}.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado Actual</label>
            <div className="p-2 bg-gray-100 rounded text-sm">
              {workOrder.status}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nuevo Estado</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-white text-black border-black/30">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {workOrder.diagnosticandoDate && (
            <div className="space-y-1 text-xs text-gray-600">
              <div>Diagnosticando: {new Date(workOrder.diagnosticandoDate).toLocaleDateString('es-CO')}</div>
              {workOrder.reparadoDate && (
                <div>Reparado: {new Date(workOrder.reparadoDate).toLocaleDateString('es-CO')}</div>
              )}
              {workOrder.entregadoDate && (
                <div>Entregado: {new Date(workOrder.entregadoDate).toLocaleDateString('es-CO')}</div>
              )}
            </div>
          )}

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
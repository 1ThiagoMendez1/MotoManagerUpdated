"use client";

import { useState, useEffect } from 'react';
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
import { updateWorkOrderStatus } from '@/lib/actions/work-orders';
import type { WorkOrder } from '@/lib/types';
import { formatExactDateTime } from '@/lib/dateUtils';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // @ts-ignore
  const [state, formAction] = useActionState(updateWorkOrderStatus, undefined);

  // Reset selected status whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(workOrder.status);
      setErrorMsg(null);
    }
  }, [isOpen, workOrder.status]);

  // React to action result
  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      setErrorMsg(null);
    } else if (state?.message) {
      setErrorMsg(state.message);
    }
  }, [state]);

  const statusOptions = [
    { value: 'Ingreso a revisión', label: 'Ingreso a revisión' },
    { value: 'Diagnosticando', label: 'Diagnosticando' },
    { value: 'En proceso', label: 'En proceso' },
    { value: 'Reparado', label: 'Reparado' },
    { value: 'Entregado', label: 'Entregado' },
    { value: 'Moto entregada por cotización rechazada', label: 'Moto entregada por cotización rechazada' },
  ];

  const handleSubmit = (formData: FormData) => {
    if (selectedStatus === workOrder.status) {
      setErrorMsg('Seleccioná un estado diferente al actual.');
      return;
    }
    setErrorMsg(null);
    formData.append('id', workOrder.id);
    formData.append('status', selectedStatus);
    // @ts-ignore
    formAction(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card/50 border-border/50 text-foreground hover:bg-card/80">
          Cambiar Estado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Actualizar Estado de Orden</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Cambia el estado de la orden de trabajo para {workOrder.motorcycle.make} {workOrder.motorcycle.model}.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Estado Actual</label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
              {workOrder.status}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nuevo Estado</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full bg-background border-input text-foreground focus:ring-2 focus:ring-primary">
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

          {errorMsg && (
            <div className="text-sm text-red-500 font-medium bg-red-500/10 rounded-md px-3 py-2">
              {errorMsg}
            </div>
          )}

          {workOrder.diagnosticandoDate && (
            <div className="space-y-1 text-xs text-gray-600">
              <div>Diagnosticando: {formatExactDateTime(workOrder.diagnosticandoDate)}</div>
              {workOrder.reparadoDate && (
                <div>Reparado: {formatExactDateTime(workOrder.reparadoDate)}</div>
              )}
              {workOrder.entregadoDate && (
                <div>Entregado: {formatExactDateTime(workOrder.entregadoDate)}</div>
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
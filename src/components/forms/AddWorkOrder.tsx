"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { createWorkOrder } from '@/lib/actions';
import type { Motorcycle, Technician } from '@/lib/types';

type AddWorkOrderProps = {
  motorcycles: Motorcycle[];
  technicians: Technician[];
};

function SubmitButton() {
  return (
    <Button type="submit">
      <PlusCircle className="mr-2 h-4 w-4" />
      Crear Orden
    </Button>
  );
}

export function AddWorkOrder({ motorcycles, technicians }: AddWorkOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  // @ts-ignore
  const [state, formAction] = useActionState(createWorkOrder, undefined);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  console.log('Work order creation result:', state);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Orden de Trabajo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Crear Nueva Orden de Trabajo</DialogTitle>
          <DialogDescription className="text-black/80">
            Completa los detalles para crear una nueva orden de trabajo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-black">Motocicleta</label>
            <Select name="motorcycleId" required>
              <SelectTrigger className="bg-white text-black border-black/30">
                <SelectValue placeholder="Selecciona una motocicleta" />
              </SelectTrigger>
              <SelectContent>
                {motorcycles.map(moto => (
                  <SelectItem key={moto.id} value={moto.id}>
                    {moto.make} {moto.model} ({moto.customer.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-black">Técnico Asignado</label>
            <Select name="technicianId" required>
              <SelectTrigger className="bg-white text-black border-black/30">
                <SelectValue placeholder="Asigna un técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-black">Descripción del Problema</label>
            <Textarea
              name="issueDescription"
              placeholder="p. ej., 'El motor falla al acelerar...'"
              className="bg-white text-black border-black/30"
              required
              minLength={10}
            />
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

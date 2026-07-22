"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { createWorkOrder } from '@/lib/actions/work-orders';
import type { Motorcycle, Technician } from '@/lib/types';

type AddWorkOrderProps = {
  motorcycles: Motorcycle[];
  technicians: Technician[];
  customTrigger?: React.ReactNode;
};

function SubmitButton() {
  return (
    <Button type="submit">
      <PlusCircle className="mr-2 h-4 w-4" />
      Crear Orden
    </Button>
  );
}

export function AddWorkOrder({ motorcycles, technicians, customTrigger }: AddWorkOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  // @ts-ignore
  const [state, formAction] = useActionState(createWorkOrder, undefined);

  useEffect(() => {
    if (state?.success) {
      console.log('Se agregó una nueva orden de trabajo');
      setIsOpen(false);
      toast({ title: 'Orden creada', description: 'La orden de trabajo ha sido creada exitosamente.' });
      router.refresh();
    } else if (state?.message) {
      toast({ title: 'Error', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Orden de Trabajo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Crear Nueva Orden de Trabajo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para crear una nueva orden de trabajo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Motocicleta</label>
            <Select name="motorcycleId" required>
              <SelectTrigger className="bg-card text-card-foreground border-border">
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
            <label className="text-sm font-medium text-foreground">Técnico Asignado</label>
            <Select name="technicianId" required>
              <SelectTrigger className="bg-card text-card-foreground border-border">
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
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

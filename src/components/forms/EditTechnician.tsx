"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { updateTechnician } from '@/lib/actions/technicians';
import type { Technician } from '@/lib/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <Edit className="mr-2 h-4 w-4" />
      Actualizar Técnico
    </Button>
  );
}

interface EditTechnicianProps {
  technician: Technician;
}

export function EditTechnician({ technician }: EditTechnicianProps) {
  const [isOpen, setIsOpen] = useState(false);
  // @ts-ignore
  const [state, formAction] = useActionState(updateTechnician, undefined);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-green-500 text-foreground hover:bg-green-600">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Técnico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Modifica los detalles del técnico seleccionado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={technician.id} />
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Nombre Completo</label>
            <Input name="name" defaultValue={technician.name} placeholder="p. ej., Juan Pérez" className="bg-card text-card-foreground border-border" required />
            {state?.errors?.name && (
              <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Especialidad</label>
            <Input name="specialty" defaultValue={technician.specialty} placeholder="p. ej., Motor y Rendimiento" className="bg-card text-card-foreground border-border" required />
            {state?.errors?.specialty && (
              <p className="text-red-500 text-xs mt-1">{state.errors.specialty[0]}</p>
            )}
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
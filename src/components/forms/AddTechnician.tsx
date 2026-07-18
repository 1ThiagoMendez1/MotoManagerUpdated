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
import { Input } from '@/components/ui/input';
import { createTechnician } from '@/lib/actions/technicians';

function SubmitButton() {
  return (
    <Button type="submit">
      <PlusCircle className="mr-2 h-4 w-4" />
      Agregar Técnico
    </Button>
  );
}

export function AddTechnician() {
  const [isOpen, setIsOpen] = useState(false);
  // @ts-ignore
  const [state, formAction] = useActionState(createTechnician, undefined);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Técnico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border/50">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar Nuevo Técnico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para agregar un nuevo miembro al equipo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Nombre Completo</label>
            <Input name="name" placeholder="p. ej., Juan Pérez" className="bg-background text-foreground border-border" required />
            {state?.errors?.name && (
              <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Especialidad</label>
            <Input name="specialty" placeholder="p. ej., Motor y Rendimiento" className="bg-background text-foreground border-border" required />
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

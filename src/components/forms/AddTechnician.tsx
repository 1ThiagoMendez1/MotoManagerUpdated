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
import { createTechnician } from '@/lib/actions';

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
      <DialogContent className="sm:max-w-[425px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Agregar Nuevo Técnico</DialogTitle>
          <DialogDescription className="text-black/80">
            Completa los detalles para agregar un nuevo miembro al equipo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-black">Nombre Completo</label>
            <Input name="name" placeholder="p. ej., Juan Pérez" className="bg-white text-black border-black/30" required />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Especialidad</label>
            <Input name="specialty" placeholder="p. ej., Motor y Rendimiento" className="bg-white text-black border-black/30" required />
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

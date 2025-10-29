"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { createCustomer } from '@/lib/actions';

function SubmitButton() {
  return (
    <Button type="submit">
      <UserPlus className="mr-2 h-4 w-4" />
      Agregar Cliente
    </Button>
  );
}

export function AddCustomer() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  // @ts-ignore
  const [state, formAction] = useActionState(createCustomer, undefined);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  const handleFormSubmit = (formData: FormData) => {
    console.log('📝 Form data being sent from AddCustomer:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    return formAction(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Agregar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Agregar Nuevo Cliente</DialogTitle>
          <DialogDescription className="text-black/80">
            Completa los detalles para agregar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <form action={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-black">Nombre</label>
            <Input name="name" placeholder="p. ej., Juan Pérez" className="bg-white text-black border-black/30" required />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Email</label>
            <Input name="email" type="email" placeholder="p. ej., juan@email.com" className="bg-white text-black border-black/30" required />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Teléfono</label>
            <Input name="phone" placeholder="p. ej., 555-0123" className="bg-white text-black border-black/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Cédula</label>
            <Input name="cedula" placeholder="p. ej., 123456789" className="bg-white text-black border-black/30" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
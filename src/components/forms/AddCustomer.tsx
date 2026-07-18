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
import { createCustomer } from '@/lib/actions/customers';

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
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar Nuevo Cliente</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para agregar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <form action={handleFormSubmit} className="space-y-4">
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Nombre</label>
            <Input name="name" placeholder="p. ej., Juan Pérez" className="bg-card text-card-foreground border-border" required />
            {state?.errors?.name && (
              <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input name="email" type="email" placeholder="p. ej., juan@email.com" className="bg-card text-card-foreground border-border" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Teléfono</label>
            <Input name="phone" placeholder="p. ej., 555-0123" className="bg-card text-card-foreground border-border" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Cédula</label>
            <Input name="cedula" placeholder="p. ej., 123456789" className="bg-card text-card-foreground border-border" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
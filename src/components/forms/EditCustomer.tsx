"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { updateCustomer } from '@/lib/actions';
import type { Customer } from '@/lib/types';

function SubmitButton() {
  return (
    <Button type="submit">
      <Edit className="mr-2 h-4 w-4" />
      Actualizar Cliente
    </Button>
  );
}

interface EditCustomerProps {
  customer: Customer;
}

export function EditCustomer({ customer }: EditCustomerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  // @ts-ignore
  const [state, formAction] = useActionState(updateCustomer, undefined);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
      setIsOpen(false);
    }
    if (state?.errors) {
      const errorMessages = Object.values(state.errors).flat().join(', ');
      toast({
        title: "Error de validación",
        description: errorMessages,
        variant: "destructive",
      });
      setIsOpen(false);
    }
  }, [state?.message, state?.errors, toast]);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente.",
      });
      setIsOpen(false);
    }
  }, [state?.success, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-green-500 text-white hover:bg-green-600">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Editar Cliente</DialogTitle>
          <DialogDescription className="text-black/80">
            Modifica los detalles del cliente seleccionado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />
          <div>
            <label className="text-sm font-medium text-black">Nombre</label>
            <Input name="name" defaultValue={customer.name} placeholder="p. ej., Juan Pérez" className="bg-white text-black border-black/30" required />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Email</label>
            <Input name="email" type="email" defaultValue={customer.email} placeholder="p. ej., juan@email.com" className="bg-white text-black border-black/30" required />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Teléfono</label>
            <Input name="phone" defaultValue={customer.phone || ''} placeholder="p. ej., 555-0123" className="bg-white text-black border-black/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-black">Cédula</label>
            <Input name="cedula" defaultValue={customer.cedula || ''} placeholder="p. ej., 123456789" className="bg-white text-black border-black/30" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
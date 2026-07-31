"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
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
import { updateCustomer } from '@/lib/actions/customers';
import type { Customer } from '@/lib/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          <Edit className="mr-2 h-4 w-4" />
          Actualizar Cliente
        </>
      )}
    </Button>
  );
}

interface EditCustomerProps {
  customer: Customer;
}

export function EditCustomer({ customer }: EditCustomerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none hover:bg-emerald-500/25">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Cliente</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Modifica los detalles del cliente seleccionado.
          </DialogDescription>
        </DialogHeader>
        {isOpen && <EditCustomerForm customer={customer} onClose={() => setIsOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerForm({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  // @ts-ignore
  const [state, formAction] = useActionState(updateCustomer, undefined);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
    }
    if (state?.errors) {
      const errorMessages = Object.values(state.errors).flat().join(', ');
      toast({
        title: "Error de validación",
        description: errorMessages,
        variant: "destructive",
      });
    }
  }, [state?.message, state?.errors, toast]);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente.",
      });
      onClose();
      router.refresh(); // Force re-render to show updated client data
    }
  }, [state?.success, toast, router, onClose]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={customer.id} />
      {state?.message && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2.5 rounded-lg text-sm font-medium">
          {state.message}
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-foreground">Nombre *</label>
        <Input name="name" defaultValue={customer.name} placeholder="p. ej., Juan Pérez" className="bg-card text-card-foreground border-border" required />
        {state?.errors?.name && (
          <p className="text-red-500 text-xs mt-1 font-medium">{state.errors.name[0]}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Email (Opcional)</label>
        <Input name="email" type="email" defaultValue={customer.email || ''} placeholder="p. ej., juan@email.com" className="bg-card text-card-foreground border-border" />
        {state?.errors?.email && (
          <p className="text-red-500 text-xs mt-1 font-medium">{state.errors.email[0]}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Teléfono (Opcional)</label>
        <Input name="phone" defaultValue={customer.phone || ''} placeholder="p. ej., 3001234567" className="bg-card text-card-foreground border-border" />
        {state?.errors?.phone && (
          <p className="text-red-500 text-xs mt-1 font-medium">{state.errors.phone[0]}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Cédula / Documento (Opcional)</label>
        <Input name="cedula" defaultValue={customer.cedula || ''} placeholder="p. ej., 123456789" className="bg-card text-card-foreground border-border" />
        {state?.errors?.cedula && (
          <p className="text-red-500 text-xs mt-1 font-medium">{state.errors.cedula[0]}</p>
        )}
      </div>

      <DialogFooter className="pt-2">
        <SubmitButton />
      </DialogFooter>
    </form>
  );
}
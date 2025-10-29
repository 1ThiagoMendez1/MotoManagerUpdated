"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { deleteCustomer } from '@/lib/actions';
import type { Customer } from '@/lib/types';

function SubmitButton() {
  return (
    <Button type="submit" variant="destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Eliminar
    </Button>
  );
}

interface DeleteCustomerProps {
  customer: Customer;
}

export function DeleteCustomer({ customer }: DeleteCustomerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  // @ts-ignore
  const [state, formAction] = useActionState(deleteCustomer, undefined);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Error",
        description: state.message,
        variant: "destructive",
      });
      setIsOpen(false);
    }
  }, [state?.message, toast]);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente.",
      });
      setIsOpen(false);
    }
  }, [state?.success, toast]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-black">Eliminar Cliente</DialogTitle>
            <DialogDescription className="text-black/80">
              ¿Estás seguro de que deseas eliminar el cliente "<span className="font-semibold">{customer.name}</span>"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={customer.id} />
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
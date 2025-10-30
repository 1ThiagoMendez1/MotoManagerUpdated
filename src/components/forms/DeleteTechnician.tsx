"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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
import { deleteTechnician } from '@/lib/actions';
import type { Technician } from '@/lib/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <Trash2 className="mr-2 h-4 w-4" />
      Eliminar
    </Button>
  );
}

interface DeleteTechnicianProps {
  technician: Technician;
}

export function DeleteTechnician({ technician }: DeleteTechnicianProps) {
  const [isOpen, setIsOpen] = useState(false);
  // @ts-ignore
  const [state, formAction] = useActionState(deleteTechnician, undefined);

  useEffect(() => {
    if (state?.message) {
      setIsOpen(false);
    }
  }, [state?.message]);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state?.success]);

  useEffect(() => {
    if (state) {
      console.log('DeleteTechnician state:', state);
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">
          <Trash2 className="h-4 w-4 mr-1" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Eliminar Técnico</DialogTitle>
          <DialogDescription className="text-black/80">
            ¿Estás seguro de que deseas eliminar el técnico "<span className="font-semibold">{technician.name}</span>"? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={technician.id} />
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
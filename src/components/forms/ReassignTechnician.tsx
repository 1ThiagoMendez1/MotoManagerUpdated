"use client";

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, UserCog } from 'lucide-react';
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
import { reassignWorkOrderTechnician } from '@/lib/actions/work-orders';
import type { WorkOrder, Technician } from '@/lib/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <UserCog className="mr-2 h-4 w-4" />
      Confirmar Traspaso
    </Button>
  );
}

interface ReassignTechnicianProps {
  workOrder: WorkOrder;
  technicians: Technician[];
}

export function ReassignTechnician({ workOrder, technicians }: ReassignTechnicianProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>(workOrder.technician?.id || '');
  // @ts-ignore
  const [state, formAction] = useActionState(reassignWorkOrderTechnician, undefined);

  const handleSubmit = (formData: FormData) => {
    formData.append('id', workOrder.id);
    formData.append('technicianId', selectedTechnician);
    // @ts-ignore
    formAction(formData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card/50 border-border/50 text-foreground hover:bg-card/80">
          <UserCog className="h-4 w-4 mr-2" />
          Traspasar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Traspasar Orden</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Reasigna esta orden de trabajo a otro técnico en caso de incapacidad o ausencia.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Técnico Actual</label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {workOrder.technician?.name ?? 'Sin asignar'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nuevo Técnico</label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
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

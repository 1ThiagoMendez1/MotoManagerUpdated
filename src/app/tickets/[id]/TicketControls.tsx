'use client';

import { useState } from 'react';
import { updateTicketStatus } from '@/lib/actions/tickets';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function TicketControls({ ticket, technicians }: { ticket: any, technicians: any[] }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (field: string, value: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('id', ticket.id);
    formData.append(field, value);

    const result = await updateTicketStatus(null, formData);
    
    if (result.success) {
      toast({ title: 'Actualizado correctamente', description: `El ${field === 'assignedTo' ? 'asignado' : field} ha sido modificado.` });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card">
      <h3 className="font-semibold text-lg">Controles del Ticket</h3>
      
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select defaultValue={ticket.status} onValueChange={(val) => handleUpdate('status', val)} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Abierto">Abierto</SelectItem>
            <SelectItem value="En Revisión">En Revisión</SelectItem>
            <SelectItem value="Resuelto">Resuelto</SelectItem>
            <SelectItem value="Cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prioridad</Label>
        <Select defaultValue={ticket.priority} onValueChange={(val) => handleUpdate('priority', val)} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baja">Baja</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Asignado a (Técnico)</Label>
        <Select defaultValue={ticket.assignedTo?.id || 'none'} onValueChange={(val) => handleUpdate('assignedTo', val)} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin asignar</SelectItem>
            {technicians.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

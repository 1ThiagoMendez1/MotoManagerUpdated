"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/lib/types';
import { User, Calendar, Clock, Wrench, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type AppointmentDetailsProps = {
  appointment: Appointment;
};

export function AppointmentDetails({ appointment }: AppointmentDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white">Detalles</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Detalles de la Cita</DialogTitle>
          <DialogDescription className="text-black/80">
            Servicio de {appointment.service} para la {appointment.motorcycle.make} {appointment.motorcycle.model}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-4 text-black">
                <div>
                    <h4 className="font-semibold mb-2 flex items-center"><Bike className="mr-2 h-4 w-4" /> Motocicleta</h4>
                    <div className="text-sm text-black/70 pl-6">
                        <p><strong>Vehículo:</strong> {appointment.motorcycle.make} {appointment.motorcycle.model} ({appointment.motorcycle.year})</p>
                        <p><strong>Cliente:</strong> {appointment.motorcycle.customer.name}</p>
                        <p><strong>Placa:</strong> <span className="font-mono">{appointment.motorcycle.plate}</span></p>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2 flex items-center"><User className="mr-2 h-4 w-4" /> Técnico</h4>
                    <div className="text-sm text-black/70 pl-6">
                        <p><strong>Asignado a:</strong> {appointment.technician.name}</p>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2 flex items-center"><Wrench className="mr-2 h-4 w-4" /> Detalles del Servicio</h4>
                    <div className="text-sm text-black/70 pl-6">
                         <p><strong>Servicio:</strong> {appointment.service}</p>
                         <p className="flex items-center"><Calendar className="mr-2 h-3 w-3" /> <strong>Fecha:</strong> {format(new Date(appointment.date), 'PPP')}</p>
                         <p className="flex items-center"><Clock className="mr-2 h-3 w-3" /> <strong>Hora:</strong> {appointment.time}</p>
                         <p><strong>Estado:</strong> <Badge className={cn(
                            appointment.status === 'Programada' && 'bg-blue-100/20 text-blue-300',
                            appointment.status === 'Completada' && 'bg-green-100/20 text-green-300',
                            'border-none text-xs'
                        )}>{appointment.status}</Badge></p>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

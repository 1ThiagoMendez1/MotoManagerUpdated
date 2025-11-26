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
import type { Motorcycle, WorkOrder } from '@/lib/types';
import { User, Calendar, Wrench, FileText, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Chat } from '../chat/Chat';

type MotorcycleDetailsProps = {
  motorcycle: Motorcycle;
  workOrders?: WorkOrder[];
};

export function MotorcycleDetails({ motorcycle, workOrders = [] }: MotorcycleDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white">
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md lg:max-w-lg bg-white text-black max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-black">{motorcycle.make} {motorcycle.model} <span className="text-black/70">({motorcycle.year})</span></DialogTitle>
          <DialogDescription className="text-black/80">
            Placa: <span className="font-mono">{motorcycle.plate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-black">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-2 flex items-center text-black"><User className="mr-2 h-4 w-4" /> Propietario</h4>
                    <div className="text-sm text-black/70 pl-6">
                        <p><strong>Nombre:</strong> {motorcycle.customer.name}</p>
                        <p><strong>Email:</strong> {motorcycle.customer.email}</p>
                        <p><strong>Teléfono:</strong> {motorcycle.customer.phone}</p>
                    </div>
                </div>
                 <div>
                     <h4 className="font-semibold mb-2 flex items-center text-black"><Calendar className="mr-2 h-4 w-4" /> Historial</h4>
                     <div className="text-sm text-black/70 pl-6">
                         <p><strong>Fecha de Ingreso:</strong> {format(new Date(motorcycle.intakeDate), 'PPP')}</p>
                     </div>
                 </div>
                 {motorcycle.issueDescription && (
                     <div>
                         <h4 className="font-semibold mb-2 flex items-center text-black"><FileText className="mr-2 h-4 w-4" /> Reporte del Cliente</h4>
                         <div className="text-sm text-black/70 pl-6">
                             <div className="bg-gray-50 p-3 rounded-md border max-h-32 overflow-y-auto">
                                 <p className="whitespace-pre-wrap break-words">{motorcycle.issueDescription}</p>
                             </div>
                         </div>
                     </div>
                 )}
                 {workOrders.length > 0 && (
                     <div>
                         <h4 className="font-semibold mb-2 flex items-center text-black"><Wrench className="mr-2 h-4 w-4" /> Órdenes de Trabajo</h4>
                         <div className="space-y-3 pl-6">
                             {workOrders.map((workOrder) => (
                                 <div key={workOrder.id} className="border-l-2 border-gray-300 pl-4">
                                     <div className="flex items-center gap-2 mb-2">
                                         <Badge
                                             variant={
                                                 workOrder.status === 'Entregado' ? 'default' :
                                                 workOrder.status === 'Reparado' ? 'secondary' :
                                                 'destructive'
                                             }
                                             className="text-xs"
                                         >
                                             {workOrder.status}
                                         </Badge>
                                         <span className="text-xs text-gray-500">#{workOrder.id}</span>
                                     </div>
                                     <div className="text-sm text-black/70 space-y-1">
                                         <p><strong>Técnico:</strong> {workOrder.technician.name}</p>
                                         {workOrder.issueDescription && <p><strong>Problema:</strong> {workOrder.issueDescription}</p>}
                                         <div className="text-xs text-gray-600 mt-2">
                                             <p><strong>Creada:</strong> {format(new Date(workOrder.createdDate), 'dd/MM/yyyy HH:mm')}</p>
                                             {workOrder.diagnosticandoDate && (
                                                 <p><strong>Diagnosticando:</strong> {format(new Date(workOrder.diagnosticandoDate), 'dd/MM/yyyy HH:mm')}</p>
                                             )}
                                             {workOrder.reparadoDate && (
                                                 <p><strong>Reparado:</strong> {format(new Date(workOrder.reparadoDate), 'dd/MM/yyyy HH:mm')}</p>
                                             )}
                                             {workOrder.entregadoDate && (
                                                 <p><strong>Entregado:</strong> {format(new Date(workOrder.entregadoDate), 'dd/MM/yyyy HH:mm')}</p>
                                             )}
                                             {workOrder.completedDate && (
                                                 <p><strong>Completada:</strong> {format(new Date(workOrder.completedDate), 'dd/MM/yyyy HH:mm')}</p>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
                 <div>
                     <h4 className="font-semibold mb-2 flex items-center text-black"><MessageCircle className="mr-2 h-4 w-4" /> Chat con Cliente</h4>
                     <Chat motorcycleId={motorcycle.id} customerPhone={motorcycle.customer.phone} />
                 </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

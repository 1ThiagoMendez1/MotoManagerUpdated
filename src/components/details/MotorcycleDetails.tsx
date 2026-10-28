"use client";

import { useState, useEffect } from 'react';
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
import { User, Calendar, Wrench, FileText } from 'lucide-react';
import { formatExactDateTime } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';

type MotorcycleDetailsProps = {
  motorcycle: Motorcycle;
  workOrders?: WorkOrder[];
};

export function MotorcycleDetails({ motorcycle, workOrders }: MotorcycleDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState(workOrders || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (workOrders) { setHistory(workOrders); return; }
    if (!isOpen) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/workshop/motorcycles/${encodeURIComponent(motorcycle.id)}/history`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok || response.redirected) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setHistory(data.items); })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar el historial. Cierra y vuelve a abrir para reintentar.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isOpen, motorcycle.id, workOrders]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent border-white/50 text-foreground hover:bg-card/50 hover:text-foreground">
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md lg:max-w-lg bg-card text-card-foreground max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{motorcycle.make} {motorcycle.model} <span className="text-muted-foreground">({motorcycle.year})</span></DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Placa: <span className="font-mono">{motorcycle.plate}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-foreground">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-2 flex items-center text-foreground"><User className="mr-2 h-4 w-4" /> Propietario</h4>
                    <div className="text-sm text-muted-foreground pl-6">
                        <p><strong>Nombre:</strong> {motorcycle.customer.name}</p>
                        <p><strong>Email:</strong> {motorcycle.customer.email}</p>
                        <p><strong>Teléfono:</strong> {motorcycle.customer.phone}</p>
                    </div>
                </div>
                 <div>
                     <h4 className="font-semibold mb-2 flex items-center text-foreground"><Calendar className="mr-2 h-4 w-4" /> Historial</h4>
                     <div className="text-sm text-muted-foreground pl-6">
                         <p><strong>Fecha de Ingreso:</strong> {formatExactDateTime(motorcycle.intakeDate)}</p>
                     </div>
                 </div>
                 {motorcycle.issueDescription && (
                     <div>
                         <h4 className="font-semibold mb-2 flex items-center text-foreground"><FileText className="mr-2 h-4 w-4" /> Reporte del Cliente</h4>
                         <div className="text-sm text-muted-foreground pl-6">
                             <div className="bg-gray-50 p-3 rounded-md border max-h-32 overflow-y-auto">
                                 <p className="whitespace-pre-wrap break-words">{motorcycle.issueDescription}</p>
                             </div>
                         </div>
                     </div>
                 )}
                 {loading && <p role="status" className="text-sm text-muted-foreground">Cargando historial…</p>}
                 {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                 {history.length > 0 && (
                     <div>
                         <h4 className="font-semibold mb-2 flex items-center text-foreground"><Wrench className="mr-2 h-4 w-4" /> Órdenes de Trabajo</h4>
                         <div className="space-y-3 pl-6">
                             {history.map((workOrder) => (
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
                                     <div className="text-sm text-muted-foreground space-y-1">
                                         <p><strong>Técnico:</strong> {workOrder.technician?.name ?? 'Sin asignar'}</p>
                                         {workOrder.issueDescription && <p><strong>Problema:</strong> {workOrder.issueDescription}</p>}
                                         <div className="text-xs text-gray-600 mt-2">
                                             <p><strong>Creada:</strong> {formatExactDateTime(workOrder.createdDate)}</p>
                                             {workOrder.diagnosticandoDate && (
                                                 <p><strong>Diagnosticando:</strong> {formatExactDateTime(workOrder.diagnosticandoDate)}</p>
                                             )}
                                             {workOrder.reparadoDate && (
                                                 <p><strong>Reparado:</strong> {formatExactDateTime(workOrder.reparadoDate)}</p>
                                             )}
                                             {workOrder.entregadoDate && (
                                                 <p><strong>Entregado:</strong> {formatExactDateTime(workOrder.entregadoDate)}</p>
                                             )}
                                             {workOrder.completedDate && (
                                                 <p><strong>Completada:</strong> {formatExactDateTime(workOrder.completedDate)}</p>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

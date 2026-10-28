"use client";

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';
import { createWorkOrder } from '@/lib/actions/work-orders';
import type { Motorcycle, Technician } from '@/lib/types';

type AddWorkOrderProps = {
  motorcycles?: Motorcycle[];
  technicians?: Technician[];
  unavailableMotorcycleIds?: string[];
  customTrigger?: React.ReactNode;
  lazy?: boolean;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <Button type="submit" disabled={disabled}>
      <PlusCircle className="mr-2 h-4 w-4" />
      Crear Orden
    </Button>
  );
}

export function AddWorkOrder({ motorcycles: initialMotorcycles = [], technicians: initialTechnicians = [], unavailableMotorcycleIds: initialBlocked = [], customTrigger, lazy = false }: AddWorkOrderProps) {
  const [options, setOptions] = useState({ motorcycles: initialMotorcycles, technicians: initialTechnicians, unavailableMotorcycleIds: initialBlocked });
  const { motorcycles, technicians, unavailableMotorcycleIds } = lazy ? options : { motorcycles: initialMotorcycles, technicians: initialTechnicians, unavailableMotorcycleIds: initialBlocked };
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const blockedIds = new Set(unavailableMotorcycleIds);
  const canCreateOrder = motorcycles.some(moto => !blockedIds.has(moto.id));
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    if (!lazy || !isOpen) return;
    const controller = new AbortController();
    setLoadingOptions(true); setOptionsError('');
    fetch('/api/workshop/options', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok || response.redirected) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setOptions(data); })
      .catch(() => { if (!controller.signal.aborted) setOptionsError('No se pudieron cargar las opciones. Cierra y vuelve a abrir para reintentar.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOptions(false); });
    return () => controller.abort();
  }, [lazy, isOpen]);


  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // @ts-ignore
  const [state, formAction] = useActionState(createWorkOrder, undefined);

  useEffect(() => {
    if (state?.success) {
      console.log('Se agregó una nueva orden de trabajo');
      setIsOpen(false);
      toast({ title: 'Orden creada', description: 'La orden de trabajo ha sido creada exitosamente.' });
      router.refresh();
    } else if (state?.message) {
      toast({ title: 'Error', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Orden de Trabajo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        {loadingOptions && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Cargando opciones…</p>}
        {optionsError && <p role="alert" className="text-sm text-destructive">{optionsError}</p>}
        <DialogHeader>
          <DialogTitle className="text-foreground">Crear Nueva Orden de Trabajo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para crear una nueva orden de trabajo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.message && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
              {state.message}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Motocicleta</label>
            <Select name="motorcycleId" required>
              <SelectTrigger className="bg-card text-card-foreground border-border">
                <SelectValue placeholder="Selecciona una motocicleta" />
              </SelectTrigger>
              <SelectContent>
                {motorcycles.map(moto => (
                  <SelectItem key={moto.id} value={moto.id} disabled={blockedIds.has(moto.id)}>
                    {moto.plate || 'S/P'} · {moto.make} {moto.model} ({moto.customer.name})
                    {blockedIds.has(moto.id) ? ' — orden abierta' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canCreateOrder && (
              <p className="text-sm text-muted-foreground mt-2">
                {motorcycles.length === 0
                  ? 'No hay motocicletas registradas para crear una orden.'
                  : 'Todas las motocicletas tienen órdenes abiertas. Entrega o cancela la orden actual antes de crear otra.'}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Técnico Asignado</label>
            <Select name="technicianId" required>
              <SelectTrigger className="bg-card text-card-foreground border-border">
                <SelectValue placeholder="Asigna un técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <SubmitButton disabled={loadingOptions || Boolean(optionsError) || !canCreateOrder || technicians.length === 0} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

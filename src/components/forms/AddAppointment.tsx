"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CalendarIcon, Loader2, PlusCircle, MessageSquare } from 'lucide-react';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Motorcycle, Technician } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createAppointment } from '@/app/appointments/actions';

const formSchema = z.object({
  plate: z.string().min(1, 'La placa de la moto es requerida.'),
  customerName: z.string().min(1, 'El nombre de la persona es requerido.'),
  customerPhone: z.string().optional(),
  service: z.string().min(3, 'La descripción del problema es requerida.'),
  date: z.date({
    required_error: 'Se requiere una fecha.',
  }),
  time: z.string().min(1, 'Se requiere la hora.'),
});

type AddAppointmentProps = {
  motorcycles?: Motorcycle[];
  technicians?: Technician[];
};

export function AddAppointment({ motorcycles = [] }: AddAppointmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plate: '',
      customerName: '',
      customerPhone: '',
      service: '',
      time: '',
    },
  });

  const { isSubmitting } = form.formState;

  // Al escribir o seleccionar la placa, autocompletar nombre y teléfono si existe la moto
  const handlePlateChange = (val: string) => {
    form.setValue('plate', val);
    const matched = motorcycles.find(
      (m) => m.plate?.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      if (matched.customer?.name) {
        form.setValue('customerName', matched.customer.name);
      }
      if (matched.customer?.phone) {
        form.setValue('customerPhone', matched.customer.phone);
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const [hours, minutes] = values.time.split(':');
    const scheduledDate = new Date(values.date);
    scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const result = await createAppointment({
      plate: values.plate,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      notes: values.service,
      scheduledStart: scheduledDate.toISOString(),
    });

    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message,
      });

      router.refresh();
      setIsOpen(false);
      form.reset();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Programar Nueva Cita</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para agendar la cita y notificar por WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Placa de la moto */}
            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Placa de la Moto</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Ej. ABC123"
                        list="motorcycle-plates-list"
                        {...field}
                        onChange={(e) => handlePlateChange(e.target.value)}
                        className="bg-card text-card-foreground border-border uppercase font-mono tracking-wider"
                      />
                      <datalist id="motorcycle-plates-list">
                        {motorcycles.map((m) => (
                          <option key={m.id} value={m.plate}>
                            {m.make} {m.model} - {m.customer?.name}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombre de la persona */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nombre de la Persona</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Juan Pérez"
                      {...field}
                      className="bg-card text-card-foreground border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono para WhatsApp */}
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground flex items-center justify-between">
                    <span>Teléfono (WhatsApp)</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-emerald-500" /> Para aviso WhatsApp
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. 3001234567"
                      {...field}
                      className="bg-card text-card-foreground border-border font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción del problema */}
            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Descripción del Problema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. Ruido en el motor, cambio de aceite, revisión de frenos..."
                      {...field}
                      className="bg-card text-card-foreground border-border resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-foreground">Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'pl-3 text-left font-normal bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Elige una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Hora</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="bg-card text-card-foreground border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4 text-emerald-400" />
                )}
                Programar Cita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

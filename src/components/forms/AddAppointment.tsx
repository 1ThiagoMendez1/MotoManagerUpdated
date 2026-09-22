"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  motorcycleId: z.string().min(1, 'Se requiere la motocicleta.'),
  technicianId: z.string().min(1, 'Se requiere el técnico.'),
  service: z.string().min(5, 'La descripción del servicio debe tener al menos 5 caracteres.'),
  date: z.date({
    required_error: "Se requiere una fecha.",
  }),
  time: z.string().min(1, "Se requiere la hora."),
});

type AddAppointmentProps = {
  motorcycles: Motorcycle[];
  technicians: Technician[];
};

export function AddAppointment({ motorcycles, technicians }: AddAppointmentProps) {
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
        motorcycleId: '',
        technicianId: '',
        service: '',
        time: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const [hours, minutes] = values.time.split(':');
    const scheduledDate = new Date(values.date);
    scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const result = await createAppointment({
      motorcycleId: values.motorcycleId,
      technicianId: values.technicianId,
      notes: values.service,
      scheduledStart: scheduledDate.toISOString()
    });

    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message,
      });
      setIsOpen(false);
      form.reset();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive"
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
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Programar Nueva Cita</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para agendar una nueva cita de servicio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motorcycleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Motocicleta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                    <FormControl>
                      <SelectTrigger className="bg-card text-card-foreground border-border">
                        <SelectValue placeholder="Selecciona una motocicleta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motorcycles.map(moto => (
                        <SelectItem key={moto.id} value={moto.id}>
                          {moto.make} {moto.model} ({moto.customer.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="technicianId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Técnico</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                    <FormControl>
                      <SelectTrigger className="bg-card text-card-foreground border-border">
                        <SelectValue placeholder="Asigna un técnico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-foreground">Descripción del Servicio</FormLabel>
                    <FormControl>
                    <Textarea placeholder="p. ej., Cambio de aceite y filtro..." {...field} className="bg-card text-card-foreground border-border" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
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
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
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
                                date < new Date() || date < new Date("1900-01-01")
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
                        <Input type="time" {...field} className="bg-card text-card-foreground border-border" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Programar Cita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { createMotorcycle, getCustomerByCedula } from '@/lib/actions';
import type { Customer, Technician } from '@/lib/types';

const formSchema = z.object({
  customerCedula: z.string().min(1, "La cédula es requerida."),
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerEmail: z.string().email("Email válido requerido."),
  customerPhone: z.string().optional(),
  make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  model: z.string().min(1, "El modelo es requerido."),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plate: z.string().min(1, "La placa es requerida."),
  issueDescription: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
});

type AddMotorcycleProps = {
    customers?: Customer[];
    technicians?: Technician[];
};

export function AddMotorcycle({ customers, technicians }: AddMotorcycleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerCedula: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      issueDescription: '',
    },
  });

  const { isSubmitting } = form.formState;
  const watchCedula = form.watch('customerCedula');

  // Auto-complete customer data when cedula changes
  useEffect(() => {
    const lookupCustomer = async () => {
      if (watchCedula && watchCedula.length > 0) {
        setIsLoading(true);
        try {
          const customer = await getCustomerByCedula(watchCedula);
          if (customer) {
            form.setValue('customerName', customer.name || '');
            form.setValue('customerEmail', customer.email || '');
            form.setValue('customerPhone', customer.phone || '');
          }
        } catch (error) {
          console.error('Error looking up customer:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(lookupCustomer, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [watchCedula, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formData = new FormData();
      formData.append('customerCedula', values.customerCedula);
      formData.append('customerName', values.customerName);
      formData.append('customerEmail', values.customerEmail);
      if (values.customerPhone) formData.append('customerPhone', values.customerPhone);
      formData.append('make', values.make);
      formData.append('model', values.model);
      formData.append('year', values.year.toString());
      formData.append('plate', values.plate);
      formData.append('issueDescription', values.issueDescription);

      console.log('Submitting form with values:', values);

      const result = await createMotorcycle(null, formData);

      console.log('Result from createMotorcycle:', result);

      if (result?.success) {
        setIsOpen(false);
        form.reset();
      } else {
        console.error('Error creating motorcycle:', result);
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Motocicleta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Agregar Nueva Motocicleta</DialogTitle>
          <DialogDescription className="text-black/80">
            Completa los detalles para registrar una nueva motocicleta en el sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-96 overflow-y-auto">
            <FormField
              control={form.control}
              name="customerCedula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Cédula del Cliente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      className="bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {isLoading && <p className="text-sm text-gray-500">Buscando cliente...</p>}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre completo"
                      className="bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Email del Cliente</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      className="bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Teléfono del Cliente (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="555-0123"
                      className="bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Marca</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="p. ej., Yamaha"
                        className="bg-white text-black border-black/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Modelo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="p. ej., MT-07"
                        className="bg-white text-black border-black/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Año</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2022"
                        className="bg-white text-black border-black/30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Placa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="p. ej., ABC-123"
                        className="bg-white text-black border-black/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="issueDescription"
              render={({ field }) => (
                <FormItem className="w-full border border-black/30 rounded-md p-3">
                  <FormLabel className="text-black">Descripción del Problema</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Describe qué le pasa a la motocicleta..."
                      className="bg-white text-black border-none resize-none h-32 w-full focus:outline-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Motocicleta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

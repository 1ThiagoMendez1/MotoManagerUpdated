"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createMotorcycle } from '@/lib/actions/motorcycles';
import { getCustomerByCedula } from '@/lib/actions/customers';
import type { Customer, Technician } from '@/lib/types';

const MOTORCYCLE_BRANDS = [
  "AKT",
  "Auteco",
  "Bajaj",
  "Benelli",
  "BMW",
  "CF Moto",
  "Ducati",
  "Hero",
  "Honda",
  "Husqvarna",
  "Kawasaki",
  "KTM",
  "Kymco",
  "Royal Enfield",
  "Suzuki",
  "Triumph",
  "TVS",
  "Victory",
  "Voge",
  "Yamaha",
  "Otra"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1989 + 2 }, (_, i) => currentYear + 1 - i);

const formSchema = z.object({
  customerCedula: z.string().optional(),
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerEmail: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim().toLowerCase()),
    z.string().email("Email válido requerido.").optional()
  ),
  customerPhone: z.string().optional(),
  make: z.string().min(2, "La marca debe tener al menos 2 caracteres."),
  model: z.string().min(1, "El modelo es requerido."),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plate: z.string().min(1, "La placa es requerida."),
  vin: z.string().optional(),
  engineDisplacementCc: z.coerce.number().optional(),
  color: z.string().optional(),
  currentMileage: z.coerce.number().optional(),
  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),
  issueDescription: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
});

type AddMotorcycleProps = {
  customers?: Customer[];
  technicians?: Technician[];
};

export function AddMotorcycle({ customers, technicians }: AddMotorcycleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openBrand, setOpenBrand] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
      vin: '',
      engineDisplacementCc: undefined,
      color: '',
      currentMileage: undefined,
      engineNumber: '',
      chassisNumber: '',
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
      if (values.customerCedula) formData.append('customerCedula', values.customerCedula);
      formData.append('customerName', values.customerName);
      if (values.customerEmail) formData.append('customerEmail', values.customerEmail);
      if (values.customerPhone) formData.append('customerPhone', values.customerPhone);
      formData.append('make', values.make);
      formData.append('model', values.model);
      formData.append('year', values.year.toString());
      formData.append('plate', values.plate);
      if (values.vin) formData.append('vin', values.vin);
      if (values.engineDisplacementCc) formData.append('engineDisplacementCc', values.engineDisplacementCc.toString());
      if (values.color) formData.append('color', values.color);
      if (values.currentMileage) formData.append('currentMileage', values.currentMileage.toString());
      if (values.engineNumber) formData.append('engineNumber', values.engineNumber);
      if (values.chassisNumber) formData.append('chassisNumber', values.chassisNumber);
      formData.append('issueDescription', values.issueDescription);

      console.log('Submitting form with values:', values);

      const result = await createMotorcycle(null, formData);

      if (result?.success) {
        setIsOpen(false);
        form.reset();
        setErrorMsg(null);
        toast({ title: 'Motocicleta registrada', description: 'La motocicleta ha sido guardada exitosamente.' });
        router.refresh();
      } else if (result?.message) {
        setErrorMsg(result.message);
      } else if (result?.errors) {
        setErrorMsg("Error de validación, revisa los campos.");
      } else {
        setErrorMsg("Ocurrió un error inesperado al crear la motocicleta.");
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
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Agregar Nueva Motocicleta</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Completa los detalles para registrar una nueva motocicleta en el sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto px-1 space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              <FormField
                control={form.control}
                name="customerCedula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Cédula del Cliente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890"
                        className="bg-card text-card-foreground border-border"
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
                    <FormLabel className="text-foreground">Nombre del Cliente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre completo"
                        className="bg-card text-card-foreground border-border"
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
                    <FormLabel className="text-foreground">Email del Cliente</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="cliente@email.com"
                        className="bg-card text-card-foreground border-border"
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
                    <FormLabel className="text-foreground">Teléfono del Cliente (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="555-0123"
                        className="bg-card text-card-foreground border-border"
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
                    <FormItem className="flex flex-col pt-[0.4rem]">
                      <FormLabel className="text-foreground">Marca</FormLabel>
                      <Popover open={openBrand} onOpenChange={setOpenBrand} modal={false}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between bg-card text-card-foreground border-border",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? field.value
                                : "Selecciona una marca"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[200px] p-0"
                          style={{ zIndex: 9999 }}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandInput placeholder="Buscar marca..." />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No se encontró la marca.</CommandEmpty>
                              <CommandGroup>
                                {MOTORCYCLE_BRANDS.map((brand) => (
                                  <CommandItem
                                    value={brand.toLowerCase()}
                                    key={brand}
                                    onSelect={(currentValue) => {
                                      const selected = MOTORCYCLE_BRANDS.find(
                                        (b) => b.toLowerCase() === currentValue.toLowerCase()
                                      ) ?? currentValue
                                      form.setValue("make", selected)
                                      setOpenBrand(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        brand === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {brand}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Modelo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="p. ej., MT-07"
                          className="bg-card text-card-foreground border-border"
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
                      <FormLabel className="text-foreground">Año</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        defaultValue={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-card text-card-foreground border-border">
                            <SelectValue placeholder="Selecciona un año" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {YEARS.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
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
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Placa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="p. ej., ABC-123"
                          className="bg-card text-card-foreground border-border"
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Color (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="p. ej., Rojo"
                          className="bg-card text-card-foreground border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentMileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Kilometraje Actual (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="p. ej., 15000"
                          className="bg-card text-card-foreground border-border"
                          {...field}
                          value={field.value || ''}
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
                  name="engineDisplacementCc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Cilindraje CC (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="p. ej., 250"
                          className="bg-card text-card-foreground border-border"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">VIN (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de identificación"
                          className="bg-card text-card-foreground border-border"
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
                  name="engineNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Número de Motor (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de motor"
                          className="bg-card text-card-foreground border-border"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chassisNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Número de Chasis (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de chasis"
                          className="bg-card text-card-foreground border-border"
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
                  <FormItem className="w-full border border-border rounded-md p-3">
                    <FormLabel className="text-foreground">Descripción del Problema</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Describe qué le pasa a la motocicleta..."
                        className="bg-card text-card-foreground border-none resize-none h-32 w-full focus:outline-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
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

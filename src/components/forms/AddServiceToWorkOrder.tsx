'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { addServiceToWorkOrder } from '@/lib/actions/work-orders-services';
import { useToast } from '@/hooks/use-toast';
import { ServiceItem } from '@/actions/services';

interface AddServiceToWorkOrderProps {
  workOrderId: string;
  services: ServiceItem[];
}

export function AddServiceToWorkOrder({ workOrderId, services }: AddServiceToWorkOrderProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!value) {
      toast({
        title: 'Atención',
        description: 'Por favor, selecciona un servicio del catálogo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addServiceToWorkOrder(workOrderId, value, 1);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Servicio agregado a la orden de trabajo.',
        });
        setValue('');
        setOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo agregar el servicio.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      <div className="w-full sm:w-[400px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-background border-border/50 hover:bg-muted/50"
              disabled={isSubmitting}
            >
              <span className="truncate flex-1 text-left">
                {value
                  ? services.find((s) => s.id === value)?.name
                  : "Seleccionar servicio del catálogo..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full sm:w-[400px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Buscar por código, nombre o categoría..." 
                onValueChange={(rawSearch) => {
                  if (!rawSearch.trim()) return;
                  const search = rawSearch.trim().toLowerCase();
                  const matches = services.filter(item =>
                    item.name.toLowerCase().includes(search) ||
                    (item.code && item.code.toLowerCase().includes(search)) ||
                    (item.category && item.category.toLowerCase().includes(search))
                  );
                  if (matches.length === 1 && matches[0].code?.trim().toLowerCase() === search) {
                    setValue(matches[0].id);
                    setOpen(false);
                  } else if (matches.length === 1) {
                     // Auto-select if there is exactly 1 match
                    setValue(matches[0].id);
                    setOpen(false);
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>No se encontró ningún servicio.</CommandEmpty>
                <CommandGroup>
                  {services.map((service) => (
                    <CommandItem
                      key={service.id}
                      value={service.id}
                      keywords={[service.name, service.code || "", service.category || ""]}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4 text-blue-500",
                            value === service.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{service.name}</span>
                          {service.category && (
                            <span className="text-xs text-muted-foreground">{service.category}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-emerald-500">
                        ${service.default_price.toLocaleString('es-CO')}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      <Button 
        onClick={handleAdd}
        disabled={!value || isSubmitting}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Agregar
      </Button>
    </div>
  );
}

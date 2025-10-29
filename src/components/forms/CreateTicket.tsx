"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, LifeBuoy } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  description: z.string().min(15, {
    message: "Por favor, describe el problema con al menos 15 caracteres.",
  }),
});

export function CreateTicket({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Simulating creating ticket:", values);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Ticket Enviado",
      description: "Hemos recibido tu reporte. Gracias por ayudarnos a mejorar.",
    });
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            Reportar un Problema o Sugerencia
          </DialogTitle>
          <DialogDescription className="text-black/80">
            Describe detalladamente el inconveniente que encontraste. Tu ayuda es valiosa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Descripción del Problema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Al intentar agregar un cliente nuevo, la página se queda en blanco y no puedo continuar..."
                      className="min-h-[150px] bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Reporte
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Loader2, Sparkles } from 'lucide-react';
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
import { suggestPotentialIssues } from '@/ai/flows/suggest-potential-issues';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  symptoms: z.string().min(10, {
    message: "Por favor, describe los síntomas en al menos 10 caracteres.",
  }),
});

export function DiagnosticAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptoms: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await suggestPotentialIssues({ symptoms: values.symptoms });
      setResult(response.suggestions);
    } catch (error) {
      console.error("Error de Diagnóstico IA:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron obtener sugerencias. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setResult(null);
      setIsLoading(false);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bot className="mr-2 h-4 w-4" />
          Diagnóstico IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black">
            <Bot className="h-6 w-6 text-primary" />
            Asistencia de Diagnóstico con IA
          </DialogTitle>
          <DialogDescription className="text-black/80">
            Describe los síntomas de la motocicleta y la IA sugerirá posibles problemas y soluciones.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Síntomas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="p. ej., 'El motor falla al acelerar, humo blanco por el escape y un ruido agudo de la transmisión...'"
                      className="min-h-[120px] bg-white text-black border-black/30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                    {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Obtener Sugerencias
                </Button>
            </DialogFooter>
          </form>
        </Form>
        {result && (
          <div className="mt-4 rounded-lg border border-black/20 bg-muted/50 p-4">
            <h3 className="font-semibold mb-2 text-black">Sugerencias:</h3>
            <p className="text-sm whitespace-pre-wrap text-black/90">{result}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

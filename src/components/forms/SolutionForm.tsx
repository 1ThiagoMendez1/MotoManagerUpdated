"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateWorkOrderSolution } from "@/lib/actions/work-orders";
import { Loader2, Check } from "lucide-react";

export function SolutionForm({ workOrderId, defaultValue }: { workOrderId: string, defaultValue?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  async function handleAction(formData: FormData) {
    try {
      setIsSubmitting(true);
      setIsSuccess(false);
      await updateWorkOrderSolution(formData);
      setIsSuccess(true);
      toast({
        title: "Solución guardada",
        description: "La solución del arreglo se ha guardado correctamente.",
      });
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la solución.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleAction} className="space-y-5">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Descripción de la solución
        </label>
        <Textarea
          name="solutionDescription"
          defaultValue={defaultValue ?? ''}
          placeholder="Ejemplo: Se reemplazó la bomba de gasolina y se ajustó el carburador..."
          className="bg-muted text-foreground border-border/50 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 min-h-[120px] transition-all resize-y placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || isSuccess}
          className={`text-white shadow-lg transition-all duration-300 ${
            isSuccess 
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              ¡Guardado!
            </>
          ) : (
            "Guardar solución"
          )}
        </Button>
      </div>
    </form>
  );
}

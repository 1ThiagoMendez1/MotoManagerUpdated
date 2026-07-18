"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { addReminderFromWorkOrder } from "@/lib/actions/reminders";
import { CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import { Reminder } from "@/lib/types";

export function AddReminderForm({ workOrderId, reminders }: { workOrderId: string, reminders: Reminder[] }) {
  const [isReminderActive, setIsReminderActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleAction(formData: FormData) {
    if (!isReminderActive) return;

    try {
      setIsSubmitting(true);
      await addReminderFromWorkOrder(formData);
      toast({
        title: "Recordatorio programado",
        description: "El recordatorio se ha guardado correctamente.",
      });
      setIsReminderActive(false); // Opcional: ocultar el formulario después de guardarlo
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el recordatorio.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <CalendarClock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">Programar Recordatorio</h4>
            <p className="text-sm text-muted-foreground">Notifica al cliente para próximos servicios</p>
          </div>
        </div>
        <Switch
          checked={isReminderActive}
          onCheckedChange={setIsReminderActive}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>

      {isReminderActive && (
        <form action={handleAction} className="space-y-4 p-4 border border-blue-500/20 rounded-xl bg-blue-500/5 animate-in fade-in slide-in-from-top-2">
          <input type="hidden" name="workOrderId" value={workOrderId} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Descripción del recordatorio</label>
              <Textarea 
                name="serviceType"
                placeholder='Ej: Debe realizarse el cambio de aceite en 4 meses o a los 3500 km'
                className="bg-muted text-foreground border-border/50 resize-none min-h-[80px]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Fecha a notificar</label>
              <Input 
                type="date"
                name="dueDate"
                className="bg-muted text-foreground border-border/50"
                required
              />
            </div>

            <div className="flex items-end justify-end">
              <Button 
                type="submit" 
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/25"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar Recordatorio"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {reminders.length > 0 && (
        <div className="mt-6 border-t border-border/50 pt-6 animate-in fade-in">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Historial de Recordatorios
          </h4>
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-muted/20 hover:bg-muted/40 p-4 rounded-xl border border-border/50 transition-colors">
                <div>
                  <p className="font-medium text-foreground mb-1">{reminder.serviceType}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Programado para: {format(new Date(reminder.dueDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="shrink-0">
                  {reminder.status === 'sent' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Enviado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

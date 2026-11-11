"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDepositToWorkOrder } from "@/lib/actions/work-orders";
import { toast } from "sonner";
import { Edit2, X } from "lucide-react";

export function AddDepositForm({ workOrderId, currentDeposit = 0 }: { workOrderId: string, currentDeposit?: number }) {
  const requestId = useRef('');
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");

  async function handleAction(formData: FormData) {
    if (pending) return;
    setPending(true);
    try {
      requestId.current ||= crypto.randomUUID();
      formData.append('requestId', requestId.current);
      formData.append("paymentMethod", paymentMethod);
      await addDepositToWorkOrder(formData);
      requestId.current = '';
      toast.success('Abono registrado. Se aplicará al facturar el servicio.');
      setResetKey(k => k + 1);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo registrar el abono.');
    } finally { setPending(false); }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end mb-1">
        <button 
          type="button" 
          disabled={pending}
          onClick={() => { setIsEditing(!isEditing); requestId.current = ''; }}
          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isEditing ? <><X className="w-3 h-3" /> Cancelar edición</> : <><Edit2 className="w-3 h-3" /> Corregir total</>}
        </button>
      </div>
      <form action={handleAction} className="flex flex-col sm:flex-row gap-3">
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input type="hidden" name="mode" value={isEditing ? "set" : "add"} />
        <CurrencyInput
          disabled={pending}
          onChange={() => { requestId.current = ''; }}
          key={resetKey + (isEditing ? 'edit' : 'add')}
          name="amount"
          placeholder={isEditing ? "Nuevo total del abono" : "Monto del abono"}
          defaultValue={isEditing ? currentDeposit : undefined}
          className="bg-card/30 text-foreground border border-border/50"
          required
        />
        <Select disabled={pending} value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-[140px] bg-card/30 border-border/50">
                <SelectValue placeholder="Medio de pago" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Nequi">Nequi</SelectItem>
                <SelectItem value="DaviPlata">DaviPlata</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
            </SelectContent>
        </Select>
        <Button disabled={pending} type="submit" variant={isEditing ? "outline" : "default"} className={!isEditing ? "bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap" : "border-emerald-500/50 hover:bg-emerald-500/10 whitespace-nowrap"}>
          {isEditing ? "Guardar total" : "Sumar abono"}
        </Button>
      </form>
    </div>
  );
}

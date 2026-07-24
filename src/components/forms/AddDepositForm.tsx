"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { addDepositToWorkOrder } from "@/lib/actions/work-orders";
import { Edit2, Plus, X } from "lucide-react";

export function AddDepositForm({ workOrderId, currentDeposit = 0 }: { workOrderId: string, currentDeposit?: number }) {
  const [resetKey, setResetKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  async function handleAction(formData: FormData) {
    try {
      await addDepositToWorkOrder(formData);
      setResetKey(k => k + 1);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end mb-1">
        <button 
          type="button" 
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isEditing ? <><X className="w-3 h-3" /> Cancelar edición</> : <><Edit2 className="w-3 h-3" /> Corregir total</>}
        </button>
      </div>
      <form action={handleAction} className="flex flex-col sm:flex-row gap-3">
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input type="hidden" name="mode" value={isEditing ? "set" : "add"} />
        <CurrencyInput
          key={resetKey + (isEditing ? 'edit' : 'add')}
          name="amount"
          placeholder={isEditing ? "Nuevo total del abono" : "Monto del abono"}
          defaultValue={isEditing ? currentDeposit : undefined}
          className="bg-card/30 text-foreground border border-border/50"
          required
        />
        <Button type="submit" variant={isEditing ? "outline" : "default"} className={!isEditing ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500/50 hover:bg-emerald-500/10"}>
          {isEditing ? "Guardar total" : "Sumar abono"}
        </Button>
      </form>
    </div>
  );
}

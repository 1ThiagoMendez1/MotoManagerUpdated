"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { addDepositToWorkOrder } from "@/lib/actions/work-orders";

export function AddDepositForm({ workOrderId }: { workOrderId: string }) {
  const [resetKey, setResetKey] = useState(0);

  async function handleAction(formData: FormData) {
    try {
      await addDepositToWorkOrder(formData);
      // Change the key to force the CurrencyInput to remount and clear its state
      setResetKey(k => k + 1);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form action={handleAction} className="mt-4 flex flex-col sm:flex-row gap-3">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <CurrencyInput
        key={resetKey}
        name="amount"
        placeholder="Monto del abono"
        className="bg-card/30 text-foreground border border-border/50"
        required
      />
      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
        Registrar abono
      </Button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WompiButton } from '@/components/payments/WompiButton';

interface WompiSaleButtonProps {
  saleId: string;
  saleNumber: string;
  total: number;
  remainingBalance?: number;
  customerEmail?: string;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Botón "Cobrar" en el detalle de una venta específica.
 * Usa el saleId + saleNumber como referencia única para Wompi.
 */
export function WompiSaleButton({ saleId, saleNumber, total, remainingBalance, customerEmail }: WompiSaleButtonProps) {
  const [open, setOpen] = useState(false);
  const amountToCharge = remainingBalance !== undefined ? remainingBalance : total;
  const amountInCents = Math.round(amountToCharge * 100);
  const reference = `MM-SALE-${saleNumber}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-[#0066cc] to-[#00aaff] hover:from-[#0077dd] hover:to-[#00bbff] text-foreground text-xs font-semibold shadow-md border border-blue-400/20 transition-all"
        >
          <CreditCard className="h-3 w-3" />
          Cobrar
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#0d0d0d]/95 backdrop-blur-xl border border-border/30 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <CreditCard className="h-4 w-4 text-blue-400" />
            </div>
            Cobrar Venta #{saleNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Procesa el pago con tarjeta, PSE, Nequi y más métodos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumen de la venta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-card/30 rounded-xl border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Referencia</p>
              <p className="text-xs font-mono text-muted-foreground">{reference}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-400/20">
              <p className="text-xs text-blue-300/80 mb-1">Total a cobrar</p>
              <p className="text-lg font-bold text-foreground">{formatCOP(amountToCharge)}</p>
            </div>
          </div>

          {customerEmail && (
            <div className="p-3 bg-card/30 rounded-xl border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Email del cliente</p>
              <p className="text-xs text-muted-foreground">{customerEmail}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Al hacer clic en "Pagar", se abrirá el checkout seguro de Wompi.
          </p>

          {/* Widget Wompi */}
          <div className="flex justify-center py-2">
            <WompiButton
              amountInCents={amountInCents}
              reference={reference}
              customerEmail={customerEmail}
              redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co'}/sales?payment=success&sale=${saleId}`}
              buttonLabel="Pagar con Wompi"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

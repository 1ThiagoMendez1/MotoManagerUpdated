'use client';

import { useState, useId } from 'react';
import { Zap, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WompiButton } from '@/components/payments/WompiButton';

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function generateReference() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MM-${now}-${rand}`;
}

export function WompiQuickChargeModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [reference] = useState(generateReference);
  const id = useId();

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const amountInCents = Math.round(amountNum * 100);
  const isValidAmount = amountInCents >= 150000; // mínimo Wompi: $1.500 COP

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-[#0066cc] to-[#00aaff] hover:from-[#0077dd] hover:to-[#00bbff] text-foreground font-semibold shadow-lg transition-all border border-blue-400/30">
          <CreditCard className="h-4 w-4" />
          Cobrar con Wompi
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#0d0d0d]/95 backdrop-blur-xl border border-border/30 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            Cobro Rápido con Wompi
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Recibe pagos con tarjeta, PSE, Nequi y más.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor={`${id}-amount`} className="text-muted-foreground text-sm font-medium">
              Monto a cobrar (COP)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                id={`${id}-amount`}
                type="number"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-card/30 border-border/30 text-foreground placeholder:text-foreground/30 focus:border-blue-400/50"
                min="1500"
              />
            </div>
            {amountNum > 0 && amountInCents < 150000 && (
              <p className="text-xs text-amber-400">El monto mínimo es $1.500 COP</p>
            )}
            {isValidAmount && (
              <p className="text-xs text-green-400 font-medium">{formatCOP(amountNum)}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor={`${id}-email`} className="text-muted-foreground text-sm font-medium">
              Email del cliente <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id={`${id}-email`}
              type="email"
              placeholder="cliente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card/30 border-border/30 text-foreground placeholder:text-foreground/30 focus:border-blue-400/50"
            />
          </div>

          {/* Referencia */}
          <div className="p-3 bg-card/30 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Referencia</p>
            <p className="text-xs font-mono text-muted-foreground">{reference}</p>
          </div>

          {/* Botón Wompi — solo visible cuando el monto es válido */}
          {isValidAmount ? (
            <WompiButton
              amountInCents={amountInCents}
              reference={reference}
              customerEmail={email || undefined}
              redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co'}/sales?payment=success`}
              buttonLabel="Pagar con Wompi"
            />
          ) : (
            <Button
              disabled
              className="w-full bg-gradient-to-r from-[#0066cc] to-[#00aaff] opacity-40 cursor-not-allowed text-foreground font-semibold h-11"
            >
              <Zap className="h-4 w-4 mr-2" />
              Ingresa un monto válido
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

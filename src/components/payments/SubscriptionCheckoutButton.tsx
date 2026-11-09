'use client';

import { useRef, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { startSubscriptionCheckout } from '@/lib/actions/subscription';
import { openWompiCheckout } from '@/lib/payments/wompi-checkout';
import { Button } from '@/components/ui/button';

export function SubscriptionCheckoutButton({ plan, cycle, customerName, label }: {
  plan: string; cycle: string; customerName: string; label: string;
}) {
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const inFlight = useRef(false);
  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError('');
    try {
      const result = await startSubscriptionCheckout(plan,cycle);
      if (result.error || !result.checkout) throw new Error(result.error || 'No pudimos preparar tu compra.');
      openWompiCheckout({ ...result.checkout, customerName,
        redirectUrl: `${window.location.origin}/dashboard/subscription?payment=return`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos abrir Wompi. Intenta de nuevo.');
      inFlight.current = false; setLoading(false);
    }
  }
  return <div className="flex flex-col items-center gap-3">
    <Button onClick={pay} disabled={loading} className="min-h-12 w-full gap-2 bg-primary text-primary-foreground">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {loading ? 'Abriendo Wompi…' : label}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive text-center">{error}</p>}
  </div>;
}

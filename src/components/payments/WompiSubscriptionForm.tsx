'use client';

import { useState } from 'react';
import { Loader2, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface WompiSubscriptionFormProps {
  planId: string;
  workshopId: string;
  userEmail: string;
  userName: string;
  amountToPay: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WompiSubscriptionForm({
  planId,
  workshopId,
  userEmail,
  userName,
  amountToPay,
  onSuccess,
  onCancel
}: WompiSubscriptionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolder, setCardHolder] = useState(userName);

  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const isProd = publicKey?.startsWith('pub_prod_');
  const wompiUrl = isProd ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleTokenizeAndSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      setError('Clave pública de Wompi no configurada.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 0. Obtener la aceptación del merchant (Requerido por Wompi)
      const merchantRes = await fetch(`${wompiUrl}/merchants/${publicKey}`);
      const merchantData = await merchantRes.json();
      
      if (!merchantRes.ok) {
         throw new Error('No se pudo obtener la configuración del comercio en Wompi.');
      }
      
      const acceptanceToken = merchantData.data.presigned_acceptance.acceptance_token;

      // 1. Tokenizar la tarjeta con Wompi
      const cleanCardNumber = cardNumber.replace(/\s+/g, '');
      const yearStr = expYear.length === 2 ? `20${expYear}` : expYear;

      const wompiRes = await fetch(`${wompiUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicKey}`
        },
        body: JSON.stringify({
          number: cleanCardNumber,
          cvc: cvc,
          exp_month: expMonth,
          exp_year: yearStr.slice(-2), // Wompi usually expects 2 digit year
          card_holder: cardHolder
          // Algunos endpoints de wompi requieren el acceptance_token aquí o en otro endpoint, pero por estándar lo enviamos si es requerido
        })
      });

      const wompiData = await wompiRes.json();

      if (!wompiRes.ok) {
        console.error("Wompi Tokenization Error:", wompiData);
        throw new Error(wompiData.error?.messages?.number?.[0] || 'Error al validar la tarjeta. Revisa los datos e intenta de nuevo.');
      }

      const paymentMethodToken = wompiData.data.id;

      // 2. Enviar el token a nuestro backend para crear la suscripción
      const subscribeRes = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: planId,
          paymentMethodToken,
          workshopId,
          userEmail,
          userName
        })
      });

      const subscribeData = await subscribeRes.json();

      if (!subscribeRes.ok) {
        throw new Error(subscribeData.error || 'Error al activar la suscripción en nuestro sistema.');
      }

      // Success
      toast({
        title: '¡Suscripción Activada!',
        description: 'El pago automático se configuró exitosamente.',
      });

      if (onSuccess) onSuccess();
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error inesperado al procesar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleTokenizeAndSubscribe} className="space-y-4 w-full text-left">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Titular de la tarjeta</label>
          <input 
            type="text" 
            required
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Número de tarjeta</label>
          <div className="relative">
            <input 
              type="text" 
              required
              maxLength={19}
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0000 0000 0000 0000"
            />
            <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Vencimiento (MM/AA)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                required
                maxLength={2}
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="MM"
              />
              <span className="text-muted-foreground flex items-center">/</span>
              <input 
                type="text" 
                required
                maxLength={2}
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="AA"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">CVC</label>
            <input 
              type="password" 
              required
              maxLength={4}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="123"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-border/30 mt-4">
        <Button
          type="submit"
          disabled={loading}
          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-bold h-12 rounded-xl shadow-lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {loading ? 'Procesando pago seguro...' : `Pagar y Suscribirse`}
        </Button>
        
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="w-full"
          >
            Cancelar
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs pt-2">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span className="text-center">Tus datos son tokenizados de forma segura por Wompi. No guardamos la información de tu tarjeta.</span>
      </div>
    </form>
  );
}

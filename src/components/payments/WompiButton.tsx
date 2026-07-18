'use client';

import { useState, useCallback } from 'react';
import { Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WompiButtonProps {
  amountInCents: number;
  reference: string;
  customerEmail?: string;
  customerName?: string;
  redirectUrl?: string;
  buttonLabel?: string;
  onPaymentResult?: (transaction: any) => void;
}

export function WompiButton({
  amountInCents,
  reference,
  customerEmail,
  customerName,
  redirectUrl,
  buttonLabel = 'Pagar con Wompi',
}: WompiButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

  /**
   * Enfoque Web Checkout (docs oficiales de Wompi).
   * 1. Pide la firma al servidor
   * 2. Crea un <form> con todos los datos y lo envía a checkout.wompi.co/p/
   * No necesita cargar ningún script externo — cero problemas de carga.
   */
  const handlePay = useCallback(async () => {
    if (!publicKey) {
      setError('NEXT_PUBLIC_WOMPI_PUBLIC_KEY no está configurada');
      return;
    }

    console.log('==== REDIRIGIENDO A WOMPI ====', {
      amountInCents,
      reference,
      customerEmail,
      customerName,
      redirectUrl
    });

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener firma del servidor
      const res = await fetch('/api/wompi/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, amountInCents, currency: 'COP' }),
      });

      const responseText = await res.text();
      let signData;
      try {
        signData = JSON.parse(responseText);
      } catch (err) {
        console.error('[Wompi] Error al parsear JSON (posible página HTML de error):', responseText);
        throw new Error('Respuesta inválida del servidor al firmar (no es JSON). Verifica la consola.');
      }

      if (!res.ok) {
        throw new Error(signData.error || `Error ${res.status} al firmar`);
      }

      const { signature } = signData;
      // Usar exactamente los mismos valores que el servidor usó para firmar
      const signedAmount = signData.amountInCents ?? String(amountInCents);
      const signedReference = signData.reference ?? reference;
      const signedCurrency = signData.currency ?? 'COP';

      console.log('[Wompi] Datos firmados recibidos:', signData);

      // 2. Redirigir usando un formulario HTML dinámico (Web Checkout)
      // Wompi (y su firewall CloudFront) a veces bloquea redirecciones directas por URL (403 Error)
      // al considerarlas peticiones de bots. Un formulario estándar es el método oficial.
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'https://checkout.wompi.co/p/';
      
      const params: Record<string, string> = {
        'public-key': publicKey,
        'currency': signedCurrency,
        'amount-in-cents': String(signedAmount),
        'reference': signedReference,
        'signature:integrity': signature,
      };

      if (redirectUrl) params['redirect-url'] = redirectUrl;
      if (customerEmail) params['customer-data:email'] = customerEmail;
      if (customerName) params['customer-data:full-name'] = customerName;

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      console.error('[Wompi]', err);
      setError(err.message || 'Error al conectar con Wompi');
      setLoading(false);
    }
  }, [publicKey, amountInCents, reference, redirectUrl, customerEmail, customerName]);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handlePay}
        disabled={loading}
        className="gap-2 bg-gradient-to-r from-[#0066cc] to-[#00aaff] hover:from-[#0077dd] hover:to-[#00bbff] text-foreground font-semibold shadow-lg transition-all disabled:opacity-60 min-w-[180px]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirigiendo…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            {buttonLabel}
          </>
        )}
      </Button>

      {error && (
        <p className="text-red-400 text-xs text-center max-w-xs">{error}</p>
      )}
    </div>
  );
}

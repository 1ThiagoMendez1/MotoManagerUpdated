import { NextResponse } from 'next/server';
import { wompiConfig } from '@/lib/payments/wompi-config';
import { subscriptionReferencePattern, wompiIntegrity } from '@/lib/payments/wompi-protocol';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { reference, amountInCents, currency } = await req.json();
    if (typeof reference !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(reference) ||
        !Number.isSafeInteger(amountInCents) || amountInCents < 150000 || currency !== 'COP') {
      return NextResponse.json({ error: 'Referencia, moneda o importe inválido.' }, { status: 400 });
    }
    if (subscriptionReferencePattern.test(reference)) {
      return NextResponse.json({ error: 'Prepara esta compra desde la suscripción de tu taller.' }, { status: 400 });
    }
    const { publicKey, integritySecret } = wompiConfig();
    if (!publicKey || !integritySecret) {
      return NextResponse.json({ error: 'El pago en línea no está disponible temporalmente. Intenta nuevamente en unos minutos.' }, { status: 503 });
    }
    return NextResponse.json({ signature: wompiIntegrity(reference,amountInCents,integritySecret), publicKey, reference, amountInCents, currency });
  } catch {
    return NextResponse.json({ error: 'No pudimos preparar el pago. Revisa los datos e intenta nuevamente.' }, { status: 400 });
  }
}

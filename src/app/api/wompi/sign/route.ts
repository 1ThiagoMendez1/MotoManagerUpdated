import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { reference, amountInCents, currency } = await req.json();

    if (!reference || !amountInCents || !currency) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: reference, amountInCents, currency' }, { status: 400 });
    }

    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!integritySecret) {
      console.warn('[Wompi Sign API] WOMPI_INTEGRITY_SECRET no está configurada.');
    }

    // Concatenate according to Wompi guidelines: reference + amountInCents + currency + integritySecret
    const concatenated = `${reference}${amountInCents}${currency}${integritySecret || ''}`;
    const signature = crypto.createHash('sha256').update(concatenated).digest('hex');

    console.log('[Wompi Sign API] Firma generada para referencia:', reference);

    return NextResponse.json({
      signature,
      reference,
      amountInCents,
      currency
    });
  } catch (error: any) {
    console.error('[Wompi Sign API] Error al generar firma de integridad:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

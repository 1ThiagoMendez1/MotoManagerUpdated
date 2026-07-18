import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * POST /api/wompi/sign
 * Genera la firma de integridad SHA256 de forma segura en el servidor.
 * Nunca expone WOMPI_INTEGRITY_SECRET al cliente.
 *
 * Body: { reference: string, amountInCents: number, currency: string }
 * Response: { signature: string, reference: string }
 *
 * IMPORTANTE: El orden exacto del hash es:
 * SHA256(reference + amountInCents + currency + integritySecret)
 * Los valores deben ser strings sin espacios ni caracteres extra.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, amountInCents, currency = 'COP' } = body;

    if (!reference || !amountInCents) {
      return NextResponse.json(
        { error: 'reference y amountInCents son requeridos' },
        { status: 400 }
      );
    }

    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (!integritySecret) {
      return NextResponse.json(
        { error: 'WOMPI_INTEGRITY_SECRET no está configurado en el servidor' },
        { status: 500 }
      );
    }

    // Wompi integrity signature: SHA256(reference + amountInCents + currency + integritySecret)
    // amountInCents debe ser string (igual al valor que se envía en el query param del form)
    const amountStr = String(amountInCents);
    const currencyStr = String(currency).trim();
    const referenceStr = String(reference).trim();
    const secretStr = String(integritySecret).trim();

    const raw = `${referenceStr}${amountStr}${currencyStr}${secretStr}`;
    const signature = createHash('sha256').update(raw).digest('hex');

    // Debug log (remover en producción)
    console.log('[Wompi Sign] Inputs:', { reference: referenceStr, amountInCents: amountStr, currency: currencyStr, secretLength: secretStr.length });
    console.log('[Wompi Sign] Raw string para hash:', raw);
    console.log('[Wompi Sign] Signature generada:', signature);

    return NextResponse.json({ signature, reference: referenceStr, amountInCents: amountStr, currency: currencyStr });
  } catch (err) {
    console.error('[Wompi Sign] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

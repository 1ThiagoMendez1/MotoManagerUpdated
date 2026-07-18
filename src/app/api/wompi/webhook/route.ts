import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/wompi/webhook
 * Recibe eventos de Wompi (transacción aprobada, rechazada, etc.)
 * y actualiza el estado del pago en Supabase.
 *
 * Configura esta URL en el dashboard de Wompi:
 * https://tudominio.com/api/wompi/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, sent_at, timestamp, signature: wompiSignature } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    // Validar la firma del evento de Wompi
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    if (integritySecret && wompiSignature?.checksum) {
      const propertiesStr = wompiSignature.properties
        ?.map((prop: string) => {
          const parts = prop.split('.');
          let value: any = data;
          for (const part of parts) {
            value = value?.[part];
          }
          return value ?? '';
        })
        .join('');

      const raw = `${propertiesStr}${timestamp}${integritySecret}`;
      const expectedChecksum = createHash('sha256').update(raw).digest('hex');

      if (expectedChecksum !== wompiSignature.checksum) {
        console.warn('[Wompi Webhook] Firma inválida — posible solicitud no autorizada');
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    // Procesar el evento
    if (event === 'transaction.updated') {
      const transaction = data?.transaction;
      if (!transaction) {
        return NextResponse.json({ ok: true, message: 'Sin datos de transacción' });
      }

      const {
        id: transactionId,
        reference,
        status,
        amount_in_cents,
        currency,
        payment_method_type,
        customer_email,
      } = transaction;

      console.log(`[Wompi Webhook] Transacción ${transactionId} — Status: ${status} — Ref: ${reference}`);

      // Guardar/actualizar el registro del pago en Supabase
      const supabase = await createClient();
      const { error } = await supabase
        .from('wompi_payments')
        .upsert({
          transaction_id: transactionId,
          reference,
          status,
          amount_in_cents,
          currency,
          payment_method: payment_method_type,
          customer_email,
          raw_payload: transaction,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'transaction_id' });

      if (error) {
        // Si la tabla no existe aún, solo loguear sin crashear
        console.warn('[Wompi Webhook] No se pudo guardar en BD:', error.message);
      }
    }

    return NextResponse.json({ ok: true, received_event: event });
  } catch (err) {
    console.error('[Wompi Webhook] Error inesperado:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

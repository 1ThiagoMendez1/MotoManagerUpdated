import { NextRequest, NextResponse } from 'next/server';
import { wompiService } from '@/lib/services/WompiService';
import { subscriptionService } from '@/lib/services/SubscriptionService';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Extraemos la firma que Wompi envía en el payload o Headers dependiendo de la versión
    // En Eventos (Webhooks), suele venir dentro del payload.signature o en el evento en sí.
    const signatureStr = req.headers.get('x-event-checksum') || '';
    const timestampStr = req.headers.get('x-event-timestamp') || '';

    // Validar la firma
    const isValid = wompiService.validateWebhookSignature(payload, signatureStr, timestampStr);

    if (!isValid) {
      console.error('Invalid Wompi webhook signature', payload);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Procesar evento
    // Wompi manda event = 'transaction.updated'
    if (payload.event === 'transaction.updated') {
        await subscriptionService.handleWompiWebhook(payload);
    } else {
        console.log(`Unhandled Wompi event: ${payload.event}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing Wompi webhook:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

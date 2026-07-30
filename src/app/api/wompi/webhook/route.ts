import { NextResponse } from 'next/server';
import { wompiService } from '@/lib/services/WompiService';
import { subscriptionService } from '@/lib/services/SubscriptionService';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDirectSalePaidNotification } from '@/lib/whatsapp';

function getFriendlyPaymentMethod(type: string) {
  if (!type) return 'Wompi';
  const t = type.toUpperCase();
  if (t === 'CARD') return 'Tarjeta';
  if (t === 'NEQUI') return 'Nequi';
  if (t === 'PSE') return 'PSE';
  if (t === 'BANCOLOMBIA') return 'Bancolombia';
  if (t === 'EFECTY') return 'Efecty';
  return `Wompi (${type})`;
}

function mapWompiToDbMethod(type: string) {
  if (!type) return 'other';
  const t = type.toUpperCase();
  if (t === 'CARD') return 'credit_card';
  if (t === 'NEQUI' || t === 'PSE' || t === 'BANCOLOMBIA') return 'transfer';
  return 'other'; // Efecty, etc.
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('[Wompi Webhook] Event received:', payload.event, 'Payload:', JSON.stringify(payload));

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (eventsSecret) {
      // Validate signature
      const isValid = wompiService.validateWebhookSignature(payload, '', '');
      if (!isValid) {
        console.error('[Wompi Webhook] Invalid signature verification');
        return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
      }
    } else {
      console.warn('[Wompi Webhook] WOMPI_EVENTS_SECRET is not set, skipping signature validation.');
    }

    const transaction = payload.data?.transaction;
    if (!transaction) {
      return NextResponse.json({ error: 'No transaction data in payload' }, { status: 400 });
    }

    const { reference, status, payment_method_type } = transaction;

    if (!reference) {
      return NextResponse.json({ error: 'No reference found in transaction' }, { status: 400 });
    }

    // 1. Subscription Webhook (Reference starting with sub_)
    if (reference.startsWith('sub_')) {
      console.log('[Wompi Webhook] Routing to SubscriptionService for reference:', reference);
      const result = await subscriptionService.handleWompiWebhook(payload);
      return NextResponse.json(result);
    }

    // 2. Direct Sale Webhook (Reference starting with SALE- or MM-SALE-)
    if (reference.startsWith('SALE-') || reference.startsWith('MM-SALE-')) {
      console.log('[Wompi Webhook] Processing direct sale payment for reference:', reference);

      if (status !== 'APPROVED') {
        console.log(`[Wompi Webhook] Sale transaction status is '${status}', not APPROVED. No action taken.`);
        return NextResponse.json({ success: true, message: `Transaction status is ${status}` });
      }

      const supabase = createAdminClient();

      // Find the sale record
      let sale: any = null;
      let error: any = null;

      if (reference.startsWith('SALE-')) {
        const saleIdPrefix = reference.split('-')[1];
        const res = await supabase
          .from('sales')
          .select('*, customers(*), organizations(*)')
          .ilike('id', `${saleIdPrefix}%`)
          .maybeSingle();
        sale = res.data;
        error = res.error;
      } else {
        const saleNumber = reference.replace('MM-SALE-', '');
        const res = await supabase
          .from('sales')
          .select('*, customers(*), organizations(*)')
          .eq('sale_number', saleNumber)
          .maybeSingle();
        sale = res.data;
        error = res.error;
      }

      if (error) {
        console.error('[Wompi Webhook] Error querying sale:', error);
        return NextResponse.json({ error: 'Error al consultar la venta' }, { status: 500 });
      }

      if (!sale) {
        console.error('[Wompi Webhook] Sale not found for reference:', reference);
        return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      }

      // Check if it's already marked as paid to prevent duplicate processing
      if (sale.status === 'paid') {
        console.log(`[Wompi Webhook] Sale ${sale.sale_number} is already marked as paid. Skipping.`);
        return NextResponse.json({ success: true, message: 'Sale already paid' });
      }

      // Update sale status and payment method in DB
      const dbMethod = mapWompiToDbMethod(payment_method_type);
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          status: 'paid',
          payment_method: dbMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', sale.id);

      if (updateError) {
        console.error('[Wompi Webhook] Error updating sale status:', updateError);
        return NextResponse.json({ error: 'Error al actualizar el estado de la venta' }, { status: 500 });
      }

      console.log(`[Wompi Webhook] Sale ${sale.sale_number} marked as paid successfully.`);

      // Send WhatsApp Alert
      const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
      const customerPhone = customer?.phone;
      const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Cliente';
      const workshop = Array.isArray(sale.organizations) ? sale.organizations[0] : sale.organizations;
      const workshopName = workshop?.name || 'MotoManager';

      if (customerPhone) {
        try {
          const friendlyMethod = getFriendlyPaymentMethod(payment_method_type);
          console.log(`[Wompi Webhook] Triggering WhatsApp notification for ${customerName} (${customerPhone})...`);
          await sendDirectSalePaidNotification(
            customerPhone,
            customerName,
            workshopName,
            sale.sale_number,
            sale.total,
            friendlyMethod
          );
        } catch (notifyError: any) {
          console.error('[Wompi Webhook] Error sending WhatsApp notification:', notifyError.message);
        }
      } else {
        console.warn('[Wompi Webhook] Customer phone not found. WhatsApp alert skipped.');
      }

      return NextResponse.json({ success: true, message: 'Venta actualizada y notificación enviada' });
    }

    console.log('[Wompi Webhook] Webhook reference did not match any routing rules:', reference);
    return NextResponse.json({ success: true, message: 'Ignored reference' });
  } catch (error: any) {
    console.error('[Wompi Webhook] Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

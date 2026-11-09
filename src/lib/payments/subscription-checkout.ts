import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchesSubscriptionCheckout, subscriptionReferencePattern, type WompiTransaction } from './wompi-protocol';

export async function applySubscriptionTransaction(transaction: WompiTransaction, organizationId?: string) {
  if (!subscriptionReferencePattern.test(transaction.reference || '')) throw new Error('La transacción no corresponde a una compra de suscripción.');
  const admin = createAdminClient();
  const { data: checkout, error } = await admin.rpc('get_workshop_subscription_checkout', {
    p_reference: transaction.reference, p_organization_id: organizationId || null,
  });
  if (error || !checkout) throw new Error('No encontramos esta compra en tu taller. Conserva el identificador de Wompi y vuelve a verificar.');
  if (!matchesSubscriptionCheckout(transaction, checkout)) throw new Error('El pago no coincide con el taller, correo o importe de esta compra.');
  const { data, error: activationError } = await admin.rpc('apply_workshop_subscription_payment', {
    p_reference: transaction.reference, p_transaction_id: transaction.id, p_status: transaction.status,
    p_amount_in_cents: transaction.amount_in_cents, p_currency: transaction.currency,
    p_email: transaction.customer_email, p_method: transaction.payment_method_type || null,
  });
  if (activationError) throw new Error('No pudimos actualizar tu suscripción. Puedes volver a verificar sin pagar otra vez.');
  return data as { status: WompiTransaction['status']; plan: string; cycle: string; alreadyApplied?: boolean };
}

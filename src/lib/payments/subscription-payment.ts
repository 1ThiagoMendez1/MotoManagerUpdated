import 'server-only';
import { createAdminClient } from '@/lib/auth-server';
import { mergePlansWithDefaults } from '@/lib/constants/plans';
import { subscriptionPrice } from '@/lib/subscription-trial';

export async function catalogSubscriptionPrice(plan: string, cycle: string) {
  const admin = await createAdminClient();
  const { data, error } = await admin.from('subscription_plans').select('*');
  if (error) throw new Error('No pudimos consultar el precio vigente. Intenta de nuevo.');
  const product = mergePlansWithDefaults(data || []).find(item => item.id === plan);
  if (!product) throw new Error('Plan inválido.');
  return subscriptionPrice(Number(product.price), cycle);
}

export function paidSubscriptionCredit(settings: Record<string, any>, planPrice: number, now = Date.now()) {
  if (settings.isTrial === true || !(Number(settings.paidAmount) > 0)) return 0;
  const start = Date.parse(settings.startDate || settings.demoStartDate || '');
  const end = Date.parse(settings.endDate || settings.demoEndDate || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= now || end <= start) return 0;
  const totalDays = Math.max(1, Math.round((end - start) / 86_400_000));
  const remainingDays = Math.ceil((end - now) / 86_400_000);
  const paid = Math.min(Number(settings.paidAmount), planPrice);
  return remainingDays >= totalDays - 5 ? paid : Math.min(paid, Math.round(paid * remainingDays / totalDays));
}

export async function verifySubscriptionPayment(input: { transactionId: string; email: string; referencePrefix: string; amount: number }) {
  if (!/^[a-zA-Z0-9-]{1,150}$/.test(input.transactionId)) throw new Error('Falta la confirmación de Wompi. Si acabas de pagar, regresa desde Wompi e intenta nuevamente.');
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  if (!privateKey) throw new Error('No se pudo verificar el pago. Comunícate con soporte para activar tu plan.');
  const production = privateKey.startsWith('prv_prod_') || process.env.WOMPI_ENVIRONMENT === 'production';
  const response = await fetch(`https://${production ? 'production' : 'sandbox'}.wompi.co/v1/transactions/${encodeURIComponent(input.transactionId)}`, {
    headers: { Authorization: `Bearer ${privateKey}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('No pudimos verificar tu transacción con Wompi. Intenta de nuevo o contacta a soporte.');
  const { data: transaction } = await response.json();
  if (transaction?.status !== 'APPROVED') throw new Error('Wompi aún no confirma un pago aprobado. Espera la aprobación antes de activar el plan.');
  if (transaction.currency !== 'COP' || transaction.amount_in_cents !== Math.round(input.amount * 100) ||
    transaction.customer_email?.toLowerCase() !== input.email.toLowerCase() ||
    !transaction.reference?.startsWith(input.referencePrefix)) throw new Error('El pago no coincide con este taller, plan, correo o valor. Comunícate con soporte.');
  return transaction;
}

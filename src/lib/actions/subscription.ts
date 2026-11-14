'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireWorkshop, createAdminClient } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { resolveWorkshopPlan } from '@/lib/workshop-plan';
import { catalogSubscriptionPrice, paidSubscriptionCredit, verifySubscriptionPayment } from '@/lib/payments/subscription-payment';
import { fetchWompiTransaction, subscriptionCheckoutReady, wompiConfig } from '@/lib/payments/wompi-config';
import { wompiIntegrity, subscriptionReferencePattern } from '@/lib/payments/wompi-protocol';
import { applySubscriptionTransaction } from '@/lib/payments/subscription-checkout';

export async function startSubscriptionCheckout(plan: string, cycle: string, receiptEmail?: string) {
  const user = await requireWorkshop({ allowExpired: true });
  if (!['owner','admin'].includes(user.role)) return { error: 'Solo el dueño o administrador puede contratar un plan.' };
  if (!['basic','pro','full'].includes(plan) || !['monthly','biannual','yearly'].includes(cycle)) return { error: 'Plan o periodo inválido.' };
  try {
    if (!subscriptionCheckoutReady()) throw new Error('El pago en línea no está disponible temporalmente. Intenta nuevamente en unos minutos.');
    const admin = await createAdminClient();
    const { data: org, error } = await admin.from('organizations').select('settings,email').eq('id',user.workshopId).single();
    if (error || !org) throw new Error('No encontramos tu taller.');
    const phoneAccount = user.app_metadata?.workshop_phone_auth === true && !user.email;
    const email = (user.email || (phoneAccount ? receiptEmail || org.email : '') || '').trim().toLowerCase();
    if (!z.string().email().max(254).safeParse(email).success) return { needsBillingEmail: true as const };
    const settings = org.settings || {};
    const price = await catalogSubscriptionPrice(plan, cycle);
    const currentPrice = await catalogSubscriptionPrice(resolveWorkshopPlan(settings), settings.billingCycle || 'monthly');
    const credit = plan !== resolveWorkshopPlan(settings) ? Math.min(price,paidSubscriptionCredit(settings,currentPrice)) : 0;
    const amountInCents = Math.round((price-credit)*100);
    if (amountInCents < 150000) throw new Error('Tu saldo a favor cubre este cambio. Contacta a soporte para aplicarlo sin realizar un cobro.');
    const { data: quote, error: quoteError } = await admin.rpc('create_workshop_subscription_checkout', {
      p_reference: `MM-SUB-${randomUUID().replaceAll('-','')}`, p_organization_id: user.workshopId,
      p_actor_id: user.userId, p_plan: plan, p_cycle: cycle, p_amount_in_cents: amountInCents, p_email: email,
    });
    if (quoteError || !quote) throw new Error('No pudimos preparar tu compra. Intenta nuevamente; no se realizó ningún cobro.');
    const { publicKey, integritySecret } = wompiConfig();
    return { checkout: {
      publicKey, reference: quote.reference, amountInCents: Number(quote.amount_in_cents), currency: 'COP',
      signature: wompiIntegrity(quote.reference,Number(quote.amount_in_cents),integritySecret),
      customerEmail: quote.customer_email,
    }};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No pudimos abrir Wompi. Intenta nuevamente.' };
  }
}

// Both the return page and the webhook use Wompi's authoritative transaction.
export async function confirmSubscriptionPayment(transactionId: string) {
  const user = await requireWorkshop({ allowExpired: true });
  if (!['owner','admin'].includes(user.role)) return { error: 'Solo el dueño o administrador puede verificar este pago.' };
  try {
    const transaction = await fetchWompiTransaction(transactionId);
    const result = await applySubscriptionTransaction(transaction,user.workshopId!);
    if (result.status === 'APPROVED') revalidatePath('/', 'layout');
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No pudimos verificar el pago. Puedes intentarlo nuevamente sin volver a pagar.' };
  }
}

// Compatibility for return links created before the immutable checkout flow.
export async function updateSubscriptionPlan(formData: FormData) {
  const user = await requireWorkshop({ allowExpired: true });
  if (!['owner', 'admin'].includes(user.role)) return { error: 'Solo el dueño o administrador puede contratar un plan.' };
  const plan = String(formData.get('plan') || '');
  const cycle = String(formData.get('billingCycle') || 'monthly');
  if (!['basic','pro','full'].includes(plan) || !['monthly','biannual','yearly'].includes(cycle)) return { error: 'Plan o ciclo inválido.' };
  try {
    const transactionId = String(formData.get('transactionId') || '');
    const transaction = await fetchWompiTransaction(transactionId);
    if (subscriptionReferencePattern.test(transaction.reference)) {
      const result = await applySubscriptionTransaction(transaction,user.workshopId!);
      if (result.status !== 'APPROVED') return { error: 'Wompi aún no confirma un pago aprobado.' };
    } else {
      const admin = await createAdminClient();
      const { data: org, error } = await admin.from('organizations').select('settings').eq('id', user.workshopId).single();
      if (error || !org) throw new Error('No encontramos tu taller.');
      const settings = org.settings || {};
      const price = await catalogSubscriptionPrice(plan, cycle);
      const currentPrice = await catalogSubscriptionPrice(resolveWorkshopPlan(settings), settings.billingCycle || 'monthly');
      const credit = plan !== resolveWorkshopPlan(settings) ? Math.min(price, paidSubscriptionCredit(settings, currentPrice)) : 0;
      const amount = price-credit;
      if (amount <= 0) throw new Error('Este cambio usa saldo a favor. Contacta a soporte para aplicarlo a tu suscripción.');
      await verifySubscriptionPayment({ transactionId, email: user.email || '',
        referencePrefix: `sub_${user.workshopId}_${plan}_${cycle}_`, amount });
      const { error: activationError } = await admin.rpc('activate_verified_workshop_subscription', {
        p_organization_id: user.workshopId, p_plan: plan, p_cycle: cycle, p_amount: amount, p_transaction_id: transaction.id,
      });
      if (activationError) throw new Error('El pago está aprobado, pero no pudimos activar el plan. Conserva el identificador de Wompi y vuelve a verificar.');
    }
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No pudimos activar el plan.' };
  }
}

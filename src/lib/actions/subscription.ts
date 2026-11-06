'use server';

import { requireWorkshop, createAdminClient } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { resolveWorkshopPlan } from '@/lib/workshop-plan';
import { catalogSubscriptionPrice, paidSubscriptionCredit, verifySubscriptionPayment } from '@/lib/payments/subscription-payment';

export async function requestSubscriptionActivation(plan: string, cycle: string) {
  const user = await requireWorkshop({ allowExpired: true });
  if (!['owner','admin'].includes(user.role) || !['basic','pro','full'].includes(plan) || !['monthly','biannual','yearly'].includes(cycle)) return { error: 'No tienes permiso para solicitar este plan.' };
  const admin = await createAdminClient();
  const subject = `Contratar MotoManager: ${plan} (${cycle})`;
  const { data: existing } = await admin.from('tickets').select('id').eq('workshop_id', user.workshopId).eq('subject', subject).in('status', ['Pendiente','Abierto']).limit(1);
  if (existing?.length) return { success: true };
  const amount = await catalogSubscriptionPrice(plan, cycle);
  const { error } = await admin.from('tickets').insert({
    workshop_id: user.workshopId, created_by: user.userId, subject,
    description: `El dueño o administrador solicita contratar el plan ${plan}, ciclo ${cycle}, por $${amount.toLocaleString('es-CO')} COP. Correo de contacto: ${user.email}. Confirmar pago y activar desde administración. La solicitud no acredita ni cobra el plan.`,
    status: 'Pendiente', priority: 'Alta',
  });
  if (error) return { error: 'No pudimos guardar tu solicitud. Intenta de nuevo en unos minutos.' };
  revalidatePath('/admin');
  return { success: true };
}

export async function updateSubscriptionPlan(formData: FormData) {
  const user = await requireWorkshop({ allowExpired: true });
  if (!['owner', 'admin'].includes(user.role)) return { error: 'Solo el dueño o administrador puede contratar un plan.' };
  const plan = String(formData.get('plan') || '');
  const cycle = String(formData.get('billingCycle') || 'monthly');
  if (!['basic','pro','full'].includes(plan) || !['monthly','biannual','yearly'].includes(cycle)) return { error: 'Plan o ciclo inválido.' };
  try {
    const admin = await createAdminClient();
    const { data: org, error } = await admin.from('organizations').select('settings').eq('id', user.workshopId).single();
    if (error || !org) throw new Error('No encontramos tu taller.');
    const settings = org.settings || {};
    const price = await catalogSubscriptionPrice(plan, cycle);
    const currentPrice = await catalogSubscriptionPrice(resolveWorkshopPlan(settings), settings.billingCycle || 'monthly');
    const credit = plan !== resolveWorkshopPlan(settings) ? Math.min(price, paidSubscriptionCredit(settings, currentPrice)) : 0;
    const amount = price - credit;
    if (amount <= 0) throw new Error('Este cambio usa saldo a favor. Contacta a soporte para aplicarlo a tu suscripción.');
    const transaction = await verifySubscriptionPayment({
      transactionId: String(formData.get('transactionId') || ''), email: user.email || '',
      referencePrefix: `sub_${user.workshopId}_${plan}_${cycle}_`, amount,
    });
    const { error: activationError } = await admin.rpc('activate_verified_workshop_subscription', {
      p_organization_id: user.workshopId, p_plan: plan, p_cycle: cycle,
      p_amount: amount, p_transaction_id: transaction.id,
    });
    if (activationError) throw new Error('El pago está aprobado, pero no pudimos activar el plan. Contacta a soporte con el ID de tu transacción.');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No pudimos activar el plan.' };
  }
}

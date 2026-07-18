import { createClient } from '@supabase/supabase-js';
import { wompiService } from './WompiService';

// Cliente de Supabase con Service Role para operaciones desde el backend / webhooks
const getAdminSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * Mapea el tipo de plan a monto en centavos y descripción.
 * Ajusta estos valores según tus precios reales.
 */
const PLAN_CONFIG: Record<string, { amountInCents: number; label: string; months: number }> = {
  monthly:  { amountInCents: 4900000,  label: 'Plan Mensual',   months: 1  },  // $49.000 COP
  biannual: { amountInCents: 24900000, label: 'Plan Semestral', months: 6  },  // $249.000 COP
  yearly:   { amountInCents: 44900000, label: 'Plan Anual',     months: 12 },  // $449.000 COP
};

export class SubscriptionService {
  /**
   * Procesa el evento de webhook desde Wompi (transacciones recurrentes)
   */
  async handleWompiWebhook(payload: any) {
    const transaction = payload.data?.transaction;

    if (!transaction) {
      throw new Error('No transaction data in webhook');
    }

    const { id: transactionId, status, payment_method_type } = transaction;
    const supabase = getAdminSupabase();

    // Idempotencia: si ya procesamos esta transacción, salir
    const { data: existingTx } = await supabase
      .from('subscription_transactions')
      .select('id')
      .eq('wompi_transaction_id', transactionId)
      .single();

    if (existingTx) {
      console.log(`[SubscriptionService] Transacción ${transactionId} ya procesada.`);
      return { success: true, message: 'Already processed' };
    }

    // Buscar a qué workshop pertenece por la referencia: formato "sub_{workshopId}_{timestamp}"
    const reference = transaction.reference;
    let workshopId: string | null = null;

    if (reference && reference.startsWith('sub_')) {
      const parts = reference.split('_');
      // sub_[UUID-36chars]_[timestamp]
      if (parts.length >= 3) {
        workshopId = parts.slice(1, parts.length - 1).join('_');
      }
    }

    // Si no se encontró por referencia, buscar por payment_source_id en workshops
    if (!workshopId && transaction.payment_source_id) {
      const { data: wsData } = await supabase
        .from('workshops')
        .select('id')
        .eq('wompi_payment_source_id', transaction.payment_source_id)
        .single();
      if (wsData) workshopId = wsData.id;
    }

    // Guardar la transacción
    await supabase.from('subscription_transactions').insert({
      workshop_id: workshopId,
      wompi_transaction_id: transactionId,
      amount: transaction.amount_in_cents / 100,
      status,
      payment_method_type: payment_method_type || transaction.payment_method?.type || 'CARD',
    });

    if (!workshopId) {
      console.warn(`[SubscriptionService] No se encontró workshop para transacción: ${transactionId}`);
      return { success: true, message: 'Transaction recorded without workshop' };
    }

    if (status === 'APPROVED') {
      await this.handleSuccessfulPayment(workshopId, transaction);
    } else if (status === 'DECLINED' || status === 'ERROR') {
      await this.handleFailedPayment(workshopId, transaction);
    }

    return { success: true };
  }

  private async handleSuccessfulPayment(workshopId: string, transaction: any) {
    const supabase = getAdminSupabase();

    const { data: workshop } = await supabase
      .from('workshops')
      .select('subscription_plan, next_billing_date')
      .eq('id', workshopId)
      .single();

    if (!workshop) return;

    const plan = workshop.subscription_plan as keyof typeof PLAN_CONFIG;
    const planConfig = PLAN_CONFIG[plan] || PLAN_CONFIG.monthly;

    const currentNextBilling = workshop.next_billing_date
      ? new Date(workshop.next_billing_date)
      : new Date();
    const baseDate = currentNextBilling > new Date() ? currentNextBilling : new Date();
    baseDate.setMonth(baseDate.getMonth() + planConfig.months);

    await supabase
      .from('workshops')
      .update({
        subscription_status: 'active',
        next_billing_date: baseDate.toISOString(),
        subscription_end_date: baseDate.toISOString(),
        failed_payment_attempts: 0,
      })
      .eq('id', workshopId);
  }

  private async handleFailedPayment(workshopId: string, transaction: any) {
    const supabase = getAdminSupabase();

    const { data: workshop } = await supabase
      .from('workshops')
      .select('failed_payment_attempts')
      .eq('id', workshopId)
      .single();

    if (!workshop) return;

    const newAttempts = (workshop.failed_payment_attempts || 0) + 1;
    const status = newAttempts >= 3 ? 'past_due' : 'active';

    await supabase
      .from('workshops')
      .update({
        failed_payment_attempts: newAttempts,
        subscription_status: status,
      })
      .eq('id', workshopId);
  }

  /**
   * Inicia una suscripción para un workshop.
   * 
   * FLUJO CORRECTO WOMPI COLOMBIA:
   * 1. Obtener acceptance_token del merchant
   * 2. Crear Payment Source con el card_token del frontend
   * 3. Cobrar inmediatamente con la Payment Source
   * 4. Guardar payment_source_id en BD para futuros cobros
   */
  async subscribeWorkshop(
    workshopId: string,
    planType: string,
    cardToken: string,        // Token de tarjeta obtenido por el frontend via /tokens/cards
    userEmail: string,
    userName: string,
  ) {
    const supabase = getAdminSupabase();

    const planConfig = PLAN_CONFIG[planType];
    if (!planConfig) {
      throw new Error(`Plan no válido: ${planType}. Use: monthly, biannual o yearly`);
    }

    const { data: workshop } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', workshopId)
      .single();

    if (!workshop) throw new Error('Taller no encontrado');

    // Paso 1: Obtener el acceptance_token requerido por Wompi
    const acceptanceToken = await wompiService.getMerchantAcceptanceToken();

    // Paso 2: Crear o reutilizar la Payment Source
    let paymentSourceId: number = workshop.wompi_payment_source_id;

    // Si se provee un cardToken (el usuario ingresó nueva tarjeta en el frontend) o no hay paymentSourceId
    if (cardToken) {
      const paymentSource = await wompiService.createPaymentSource(
        cardToken,
        acceptanceToken,
        userEmail,
      );
      paymentSourceId = paymentSource.id;

      // Guardar el payment_source_id en el workshop
      await supabase
        .from('workshops')
        .update({ wompi_payment_source_id: paymentSourceId })
        .eq('id', workshopId);
    } else if (!paymentSourceId) {
      throw new Error('No hay método de pago configurado y no se proporcionó uno nuevo.');
    }

    // Paso 3: Crear la transacción del cobro inicial
    const reference = `sub_${workshopId}_${Date.now()}`;
    const transaction = await wompiService.createTransaction(
      paymentSourceId,
      planConfig.amountInCents,
      userEmail,
      reference,
      acceptanceToken,
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planConfig.months);

    // Paso 4: Actualizar el estado en BD según el resultado de la transacción
    const transactionStatus = transaction.status;
    const subscriptionStatus = transactionStatus === 'APPROVED' ? 'active' : 'pending';

    await supabase.from('workshops').update({
      wompi_payment_source_id: paymentSourceId,
      subscription_plan: planType,
      subscription_start_date: startDate.toISOString(),
      subscription_end_date: endDate.toISOString(),
      next_billing_date: endDate.toISOString(),
      subscription_status: subscriptionStatus,
      failed_payment_attempts: 0,
    }).eq('id', workshopId);

    // Registrar la transacción
    await supabase.from('subscription_transactions').insert({
      workshop_id: workshopId,
      wompi_transaction_id: transaction.id,
      amount: planConfig.amountInCents / 100,
      status: transactionStatus,
      payment_method_type: 'CARD',
    });

    if (transactionStatus === 'DECLINED' || transactionStatus === 'ERROR') {
      throw new Error(`El cobro fue rechazado: ${transaction.status_message || 'Tarjeta declinada'}. Verifica los datos de tu tarjeta.`);
    }

    return { success: true, transaction, paymentSourceId };
  }

  /**
   * Cancela la renovación automática.
   * En Wompi Colombia, "cancelar" significa simplemente no volver a cobrar.
   * No hay un endpoint para eliminar Payment Sources, solo se deja de usar.
   */
  async cancelRenewal(workshopId: string) {
    const supabase = getAdminSupabase();

    await supabase.from('workshops').update({
      subscription_status: 'canceled',
      wompi_payment_source_id: null,
    }).eq('id', workshopId);

    return { success: true };
  }

  /**
   * Ejecuta el cobro recurrente para un workshop activo.
   * Llamado por un cron job cuando llega la fecha de renovación.
   */
  async chargeRecurringPayment(workshopId: string) {
    const supabase = getAdminSupabase();

    const { data: workshop } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', workshopId)
      .single();

    if (!workshop) throw new Error('Taller no encontrado');
    if (!workshop.wompi_payment_source_id) throw new Error('No hay fuente de pago registrada');
    if (workshop.subscription_status !== 'active') throw new Error('La suscripción no está activa');

    const planType = workshop.subscription_plan as keyof typeof PLAN_CONFIG;
    const planConfig = PLAN_CONFIG[planType];
    if (!planConfig) throw new Error(`Plan inválido: ${planType}`);

    const acceptanceToken = await wompiService.getMerchantAcceptanceToken();
    const reference = `sub_${workshopId}_${Date.now()}`;

    const transaction = await wompiService.createTransaction(
      workshop.wompi_payment_source_id,
      planConfig.amountInCents,
      workshop.owner_email || workshop.email,
      reference,
      acceptanceToken,
    );

    await supabase.from('subscription_transactions').insert({
      workshop_id: workshopId,
      wompi_transaction_id: transaction.id,
      amount: planConfig.amountInCents / 100,
      status: transaction.status,
      payment_method_type: 'CARD',
    });

    if (transaction.status === 'APPROVED') {
      await this.handleSuccessfulPayment(workshopId, transaction);
    } else {
      await this.handleFailedPayment(workshopId, transaction);
    }

    return { success: true, transaction };
  }
}

export const subscriptionService = new SubscriptionService();

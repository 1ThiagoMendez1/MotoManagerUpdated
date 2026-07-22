'use server';



import { subscriptionService } from '@/lib/services/SubscriptionService';

/**
 * Suscribe un workshop a un plan
 * @param workshopId ID del workshop
 * @param planType Tipo de plan ('monthly', 'biannual', 'yearly')
 * @param paymentMethodToken Token de Wompi del medio de pago
 */
export async function createSubscriptionAction(workshopId: string, planType: string, paymentMethodToken: string) {
  try {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    
    // Verificar sesión y permisos
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('No autorizado');
    
    // Verificar si el usuario es dueño/admin del workshop
    const { data: member } = await supabase
      .from('workshop_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workshop_id', workshopId)
      .single();
      
    if (!member || !['owner', 'admin'].includes(member.role)) {
       throw new Error('No tienes permisos para cambiar la suscripción de este taller.');
    }
    
    const userEmail = user.email || 'usuario@example.com';
    const userName = user.user_metadata?.name || 'Usuario MotoManager';

    const result = await subscriptionService.subscribeWorkshop(workshopId, planType, paymentMethodToken, userEmail, userName);
    return { success: true, data: result };

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message || 'Error al crear la suscripción' };
  }
}

/**
 * Cancela la renovación automática
 */
export async function cancelAutoRenewalAction(workshopId: string) {
  try {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('No autorizado');
    
    const { data: member } = await supabase
      .from('workshop_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workshop_id', workshopId)
      .single();
      
    if (!member || !['owner', 'admin'].includes(member.role)) {
       throw new Error('No tienes permisos.');
    }
    
    const result = await subscriptionService.cancelRenewal(workshopId);
    return result;

  } catch (error: any) {
    console.error('Error cancelling auto-renewal:', error);
    return { success: false, error: error.message || 'Error al cancelar' };
  }
}

/**
 * Obtiene el historial de pagos
 */
export async function getSubscriptionHistoryAction(workshopId: string) {
  try {
    const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
    
    // RLS protegerá la lectura si el usuario está autenticado
    const { data, error } = await supabase
      .from('subscription_transactions')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return { success: false, error: error.message || 'Error al consultar el historial' };
  }
}

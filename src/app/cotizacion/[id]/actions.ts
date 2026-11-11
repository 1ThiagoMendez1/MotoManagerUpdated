'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'
import { canAccessOwnCustomerQuote } from './access';

export async function submitQuoteResponse(workOrderId: string, response: 'approved' | 'rejected', formData?: FormData) {
  if (!workOrderId) return { success: false, message: 'ID de orden inválido.' }
  if (!await canAccessOwnCustomerQuote(workOrderId)) return { success:false, message:'No tienes permiso para responder a esta cotización.' };
  if (response !== 'approved' && response !== 'rejected') return {success:false,message:'Respuesta inválida.'};

  let rejectionReason = '';
  if (formData && response === 'rejected') {
      const rawReason = formData.get('rejectionReason');
      rejectionReason = typeof rawReason === 'string' ? rawReason.trim().slice(0, 500) : '';
  }

  const supabase = await createAdminClient()

  // First, verify the order exists and is pending
  const { data: order, error: fetchError } = await supabase
    .from('work_orders')
    .select('organization_id, quote_status, status, customer_observations')
    .eq('id', workOrderId)
    .single()

  if (fetchError || !order) {
    return { success: false, message: 'Orden no encontrada.' }
  }

  if (order.quote_status !== 'pending' && order.quote_status !== null) {
    return { success: false, message: 'Esta cotización ya fue respondida.' }
  }

  // The RPC locks the order, claims its first response and reserves parts in one transaction.
  const { error } = await supabase.rpc('change_work_order_parts', {
    p_org: order.organization_id, p_work_order: workOrderId, p_action: 'customer_quote', p_quote: response,
  });
  if (error) return { success: false, message: error.message };
  if (response === 'rejected' && rejectionReason) {
    await supabase.from('work_orders').update({ customer_observations:
      (order.customer_observations || '') + `\n[Cotización rechazada por cliente: ${rejectionReason}]` }).eq('id',workOrderId);
  }

  revalidatePath(`/cotizacion/${workOrderId}`)
  // Also revalidate the dashboard view so tech sees it immediately if they refresh, 
  // although we will add realtime as requested.
  revalidatePath(`/work-orders/${workOrderId}`)

  return { success: true }
}

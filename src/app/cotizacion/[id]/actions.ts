'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'

export async function submitQuoteResponse(workOrderId: string, response: 'approved' | 'rejected') {
  if (!workOrderId) return { success: false, message: 'ID de orden inválido.' }

  const supabase = await createAdminClient()

  // First, verify the order exists and is pending
  const { data: order, error: fetchError } = await supabase
    .from('work_orders')
    .select('quote_status, status')
    .eq('id', workOrderId)
    .single()

  if (fetchError || !order) {
    return { success: false, message: 'Orden no encontrada.' }
  }

  if (order.quote_status !== 'pending' && order.quote_status !== null) {
    return { success: false, message: 'Esta cotización ya fue respondida.' }
  }

  // Determine new work order status based on response
  const newStatus = response === 'approved' ? 'Reparado' : 'Diagnosticando'; // Let's keep it in Diagnosticando if rejected, or just don't change it. We'll leave it as Diagnosticando so tech can review.

  // Update the quote_status and quote_responded_at
  const { error: updateError } = await supabase
    .from('work_orders')
    .update({ 
        quote_status: response, 
        quote_responded_at: new Date().toISOString(),
        // If approved, we could optionally update the status. But we'll let the user update it or update it here.
        // Let's just update the quote status for now so the tech manually changes state.
        // The prompt said "en el momento que apruebe el tecnico pueda proceder", implying tech sees it and proceeds.
    })
    .eq('id', workOrderId)

  if (updateError) {
    return { success: false, message: 'Error al guardar la respuesta.' }
  }

  revalidatePath(`/cotizacion/${workOrderId}`)
  // Also revalidate the dashboard view so tech sees it immediately if they refresh, 
  // although we will add realtime as requested.
  revalidatePath(`/work-orders/${workOrderId}`)

  return { success: true }
}

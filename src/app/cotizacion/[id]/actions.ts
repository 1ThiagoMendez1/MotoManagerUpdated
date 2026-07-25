'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';



import { revalidatePath } from 'next/cache'

export async function submitQuoteResponse(workOrderId: string, response: 'approved' | 'rejected', formData?: FormData) {
  if (!workOrderId) return { success: false, message: 'ID de orden inválido.' }

  let rejectionReason = '';
  if (formData && response === 'rejected') {
      rejectionReason = formData.get('rejectionReason') as string || '';
  }

  const supabase = await createAdminClient()

  // First, verify the order exists and is pending
  const { data: order, error: fetchError } = await supabase
    .from('work_orders')
    .select('quote_status, status, customer_observations')
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

  // Manage inventory based on response
  const { data: sale } = await supabase.from('sales').select('id').eq('work_order_id', workOrderId).maybeSingle();
  let quoteItems: any[] = [];
  if (sale) {
      const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      quoteItems = items || [];
  }

  if (response === 'approved') {
      for (const item of quoteItems) {
          if (item.item_type === 'inventory' && item.inventory_item_id) {
              await supabase.rpc('decrement_inventory', { item_id: item.inventory_item_id, amount: item.quantity });
          }
      }
      // Opcional: Actualizar el estado de la orden a 'diagnosis' para mantener sincronía con el dashboard
      await supabase.from('work_orders').update({ status: 'diagnosis' }).eq('id', workOrderId);
  } else if (response === 'rejected') {
      if (sale && quoteItems.length > 0) {
          // Dejar historial de rechazo sin borrar los items
          const reasonText = rejectionReason.trim() ? ` - Motivo: ${rejectionReason.trim()}` : '';
          const rejectMsg = `\n[Cotización Rechazada por Cliente${reasonText}]`;
          const newObs = (order.customer_observations || '') + rejectMsg;
          
          await supabase.from('work_orders').update({ customer_observations: newObs, status: 'diagnosis' }).eq('id', workOrderId);
      } else {
          // Aún sin items, actualizamos el estado
          const reasonText = rejectionReason.trim() ? ` - Motivo: ${rejectionReason.trim()}` : '';
          const rejectMsg = `\n[Cotización Rechazada por Cliente${reasonText}]`;
          const newObs = (order.customer_observations || '') + rejectMsg;
          await supabase.from('work_orders').update({ status: 'diagnosis', customer_observations: newObs }).eq('id', workOrderId);
      }
  }

  revalidatePath(`/cotizacion/${workOrderId}`)
  // Also revalidate the dashboard view so tech sees it immediately if they refresh, 
  // although we will add realtime as requested.
  revalidatePath(`/work-orders/${workOrderId}`)

  return { success: true }
}

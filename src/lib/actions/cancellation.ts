'use server';
import { getCurrentUserServer, requireWorkshop, getWorkshopDetails, createAdminClient, getScopedClient } from '@/lib/auth-server';





const REASON_LABELS: Record<string, string> = {
  price: 'El precio es muy alto',
  features: 'Me faltan funciones que necesito',
  complicated: 'Es complicado de usar',
  not_using: 'No lo estoy usando lo suficiente',
  competitor: 'Me cambio a otra plataforma',
  pausing: 'Solo quiero pausar por ahora',
}

export async function saveCancellationFeedback(reason: string) {
  try {
    const user = await requireWorkshop()
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('cancellation_feedback')
      .insert({
        workshop_id: user.workshopId,
        user_id: user.userId,
        reason_code: reason,
        reason_label: REASON_LABELS[reason] || reason,
        status: 'pending',         // pending | contacted | resolved | lost
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[cancellation_feedback] insert error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[saveCancellationFeedback]', err)
    return { success: false }
  }
}

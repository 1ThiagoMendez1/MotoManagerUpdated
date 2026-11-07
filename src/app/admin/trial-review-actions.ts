'use server';

import { requireSuperAdmin } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { pauseTrialSchema, verifyTrialSchema } from '@/lib/trial-review';

export async function pauseWorkshopTrial(input: unknown) {
  const actor = await requireSuperAdmin();
  const parsed = pauseTrialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' };
  return saveReview(actor.userId, parsed.data.workshopId, 'pause', parsed.data.reason, parsed.data.message, {});
}

export async function verifyWorkshopTrial(input: unknown) {
  const actor = await requireSuperAdmin();
  const parsed = verifyTrialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Completa los datos del taller, la evidencia y las tres comprobaciones.' };
  return saveReview(actor.userId, parsed.data.workshopId, 'verify', parsed.data.reason, '', parsed.data.verification);
}

async function saveReview(actorId: string, workshopId: string, action: string, reason: string, message: string, verification: object) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('admin_review_workshop_trial', {
    p_actor_id: actorId, p_organization_id: workshopId, p_action: action,
    p_reason: reason, p_public_message: message, p_verification: verification,
  });
  if (error) {
    console.error('[trial-review] Operation failed:', error.code);
    return { success: false, error: error.code === '22023'
      ? 'Solo se puede pausar una prueba gratuita vigente o reactivar una revisión pendiente. Actualiza la página.'
      : 'No se pudo guardar la revisión. Intenta de nuevo.' };
  }
  revalidatePath('/', 'layout');
  return { success: true };
}

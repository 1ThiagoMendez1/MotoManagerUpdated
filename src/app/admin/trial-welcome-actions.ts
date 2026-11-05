'use server';

import { requireSuperAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { previewTrialWelcome, sendWorkshopTrialWelcome } from '@/lib/trial-welcome-server';

export async function getTrialWelcomePreview(workshopId: string) {
  await requireSuperAdmin();
  try { return await previewTrialWelcome(workshopId); }
  catch { return { success: false as const, error: 'No pudimos consultar la bienvenida. Intenta de nuevo.' }; }
}
export async function resendTrialWelcome(workshopId: string, requestId: string) {
  const admin = await requireSuperAdmin();
  try {
    const result = await sendWorkshopTrialWelcome(workshopId, requestId, 'admin', admin.userId);
    revalidatePath('/admin');
    return result;
  } catch {
    return { success: false, status: 'unconfirmed' as const,
      message: 'No pudimos confirmar el envío. Revisa si llegó antes de intentar otro reenvío.' };
  }
}

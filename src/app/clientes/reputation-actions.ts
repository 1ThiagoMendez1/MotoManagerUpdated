'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';

export async function getOwnAvatarUrl(): Promise<string | null> {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email_confirmed_at) return null;
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle();
  if (!data?.avatar_path?.startsWith(user.id + '/')) return null;
  const { data: url } = await admin.storage.from('profile-avatars')
    .createSignedUrl(data.avatar_path, 3600);
  return url?.signedUrl || null;
}

export async function uploadOwnAvatar(formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user?.email_confirmed_at) {
    return { success: false, message: 'Inicia sesión y verifica tu correo para subir una foto.' };
  }
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) {
    return { success: false, message: 'Selecciona una imagen de máximo 2 MB.' };
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  const jpg = buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length > 8 && [137,80,78,71,13,10,26,10].every((v,i) => buffer[i] === v);
  const webp = buffer.length > 12 && String.fromCharCode(...buffer.slice(0,4)) === 'RIFF' &&
    String.fromCharCode(...buffer.slice(8,12)) === 'WEBP';
  const kind = jpg ? { ext: 'jpg', mime: 'image/jpeg' } : png ? { ext: 'png', mime: 'image/png' } :
    webp ? { ext: 'webp', mime: 'image/webp' } : null;
  if (!kind || file.type !== kind.mime) {
    return { success: false, message: 'Solo aceptamos archivos JPG, PNG o WebP auténticos.' };
  }
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle();
  const key = user.id + '/' + randomUUID() + '.' + kind.ext;
  const bucket = admin.storage.from('profile-avatars');
  const { error: uploadError } = await bucket.upload(key, buffer, {
    contentType: kind.mime, cacheControl: '3600', upsert: false,
  });
  if (uploadError) return { success: false, message: 'No se pudo subir la foto. Prueba con otra imagen.' };
  const { error: updateError } = await admin.from('profiles').upsert({ id: user.id, avatar_path: key }, { onConflict: 'id' });
  if (updateError) {
    await bucket.remove([key]);
    return { success: false, message: 'No se pudo guardar la foto en tu perfil.' };
  }
  if (profile?.avatar_path?.startsWith(user.id + '/')) {
    await bucket.remove([profile.avatar_path]);
  }
  const { data: signed } = await bucket.createSignedUrl(key, 3600);
  revalidatePath('/clientes');
  revalidatePath('/dashboard/profile');
  return { success: true, message: 'Foto de perfil actualizada.', url: signed?.signedUrl };
}

export async function submitCustomerServiceReview(input: {
  workOrderId: string;
  rating: number;
  recommended: boolean;
  comment: string;
  publishComment: boolean;
}): Promise<{ success: boolean; message: string }> {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email_confirmed_at) return { success: false, message: 'Debes iniciar sesión y verificar tu correo.' };
  if (!/^[a-f0-9-]{36}$/i.test(input.workOrderId) ||
    !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 ||
    typeof input.recommended !== 'boolean' ||
    typeof input.publishComment !== 'boolean' ||
    typeof input.comment !== 'string' || input.comment.trim().length > 700) {
    return { success: false, message: 'Revisa la calificación y el comentario (máximo 700 caracteres).' };
  }
  // The database function checks authenticated ownership, delivery and tenant again.
  const { error } = await (auth as any).rpc('submit_verified_service_review', {
    p_work_order_id: input.workOrderId,
    p_rating: input.rating,
    p_recommended: input.recommended,
    p_comment: input.comment.trim(),
    p_publish_comment: input.publishComment,
  });
  if (error) return { success: false, message: 'Solo puedes valorar órdenes entregadas asociadas a tu cuenta verificada.' };
  revalidatePath('/clientes');
  revalidatePath('/planes');
  return { success: true, message: '¡Gracias! Tu opinión ayudará a otras personas a elegir su taller.' };
}

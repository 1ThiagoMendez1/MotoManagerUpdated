'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_WORKSHOP_IMAGE_SIZE, WORKSHOP_IMAGE_BUCKET, publicWorkshopImageUrl, workshopImageKind, workshopImagePath, ownProfileAvatarPath } from '@/lib/workshops/public-image';

export async function saveWorkshopImage(formData: FormData): Promise<{ success: boolean; message: string; url?: string | null }> {
  const member = await requireWorkshop();
  if (!member.workshopId || !['owner', 'admin'].includes(member.role)) {
    return { success: false, message: 'Solo el propietario o administrador puede cambiar la imagen del taller.' };
  }
  const auth = await createClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user?.email_confirmed_at) return { success: false, message: 'Verifica tu correo antes de cambiar la imagen del taller.' };
  const removing = formData.get('remove') === 'true';
  const file = formData.get('image');
  let upload: { bytes: Uint8Array; ext: string; mime: string } | null = null;
  if (!removing) {
    if (!(file instanceof File) || !file.size || file.size > MAX_WORKSHOP_IMAGE_SIZE) {
      return { success: false, message: 'Selecciona una imagen de máximo 2 MB.' };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = workshopImageKind(bytes, file.type);
    if (!kind) return { success: false, message: 'Solo aceptamos archivos JPG, PNG o WebP auténticos.' };
    upload = { bytes, ...kind };
  }
  const admin = createAdminClient();
  const { data: organization, error: lookupError } = await admin.from('organizations')
    .select('slug, settings').eq('id', member.workshopId).single();
  if (lookupError || !organization) return { success: false, message: 'No se pudo consultar la imagen del taller.' };
  const previousPath = workshopImagePath(organization.settings, member.workshopId);
  const bucket = admin.storage.from(WORKSHOP_IMAGE_BUCKET);
  const nextPath = upload ? `${member.workshopId}/${randomUUID()}.${upload.ext}` : null;
  if (upload && nextPath) {
    const { error } = await bucket.upload(nextPath, upload.bytes, {
      contentType: upload.mime, cacheControl: '3600', upsert: false,
    });
    if (error) {
      console.error('[workshop-image] Upload failed', { status: error.statusCode });
      return { success: false, message: 'No se pudo subir la imagen. Comprueba que el almacenamiento del taller esté habilitado.' };
    }
  }
  // SQL validates active membership, verified email, tenant path and object existence again.
  // Merge just this setting so concurrent hours/QR/profile changes survive.
  const { error: saveError } = await auth.rpc('set_workshop_public_image', {
    p_organization_id: member.workshopId, p_image_path: nextPath,
  });
  if (saveError) {
    if (nextPath) await bucket.remove([nextPath]);
    console.error('[workshop-image] Save failed', { code: saveError.code });
    return { success: false, message: 'No se pudo guardar la imagen del taller.' };
  }
  if (previousPath) await bucket.remove([previousPath]);
  revalidatePath('/');
  revalidatePath('/dashboard/profile');
  revalidatePath(`/talleres/${organization.slug}`);
  return {
    success: true, message: removing ? 'Imagen del taller retirada.' : 'Imagen del taller publicada.',
    url: nextPath ? publicWorkshopImageUrl({ public_image_path: nextPath }, member.workshopId, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null,
  };
}

/**
 * Explicit publication only: copy the signed-in manager's existing PRIVATE
 * profile avatar into the workshop's PUBLIC image bucket. Never expose
 * private profile-avatars URLs in landing pages or change other users' photos.
 */
export async function publishMyProfileAvatarForWorkshop(): Promise<{ success: boolean; message: string; url?: string | null }> {
  const member = await requireWorkshop();
  if (!member.workshopId || !['owner', 'admin'].includes(member.role)) {
    return { success: false, message: 'Solo el propietario o administrador puede publicar la imagen del taller.' };
  }
  const auth = await createClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user?.email_confirmed_at) {
    return { success: false, message: 'Debes iniciar sesión con una cuenta verificada.' };
  }
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('avatar_path').eq('id', user.id).maybeSingle();
  const privatePath = ownProfileAvatarPath(profile?.avatar_path, user.id);
  if (profileError || !privatePath) {
    return { success: false, message: 'Primero sube una foto a tu perfil.' };
  }
  const { data: organization, error: lookupError } = await admin.from('organizations')
    .select('slug, settings').eq('id', member.workshopId).single();
  if (lookupError || !organization) return { success: false, message: 'No se encontró el taller.' };
  const { data: photo, error: downloadError } = await admin.storage
    .from('profile-avatars').download(privatePath);
  if (downloadError || !photo) {
    return { success: false, message: 'No se pudo leer la foto privada de tu perfil.' };
  }
  if (photo.size === 0 || photo.size > MAX_WORKSHOP_IMAGE_SIZE) {
    return { success: false, message: 'La foto de perfil excede el máximo de 2 MB.' };
  }
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const ext = privatePath.split('.').pop()!;
  const mime = ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
  const kind = workshopImageKind(bytes, mime);
  if (!kind) return { success: false, message: 'La foto de perfil no tiene un formato válido.' };

  const oldPath = workshopImagePath(organization.settings, member.workshopId);
  const nextPath = `${member.workshopId}/${randomUUID()}.${kind.ext}`;
  const bucket = admin.storage.from(WORKSHOP_IMAGE_BUCKET);
  const { error: uploadError } = await bucket.upload(nextPath, bytes, {
    contentType: kind.mime, cacheControl: '3600', upsert: false,
  });
  if (uploadError) {
    return { success: false, message: 'No se pudo publicar la imagen. Intenta nuevamente.' };
  }

  // The existing DB RPC rechecks the user's membership, the destination path,
  // the existence of the storage object, and applies an atomic JSONB patch.
  const { error: saveError } = await auth.rpc('set_workshop_public_image', {
    p_organization_id: member.workshopId, p_image_path: nextPath,
  });
  if (saveError) {
    await bucket.remove([nextPath]);
    return { success: false, message: 'No se pudo vincular la foto al taller.' };
  }
  if (oldPath) await bucket.remove([oldPath]);
  revalidatePath('/');
  revalidatePath('/dashboard/profile');
  revalidatePath(`/talleres/${organization.slug}`);
  return {
    success: true,
    message: 'Foto de perfil publicada como imagen del taller. Ya es visible en la landing.',
    url: publicWorkshopImageUrl({ public_image_path: nextPath }, member.workshopId, process.env.NEXT_PUBLIC_SUPABASE_URL!),
  };
}

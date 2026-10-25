export const WORKSHOP_IMAGE_BUCKET = 'workshop-images';
export const MAX_WORKSHOP_IMAGE_SIZE = 2 * 1024 * 1024;

export function workshopImagePath(settings: unknown, organizationId: string): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
      !/^[a-f0-9-]{36}$/i.test(organizationId)) return null;
  const path = (settings as Record<string, unknown>).public_image_path;
  if (typeof path !== 'string' || !path.startsWith(organizationId + '/')) return null;
  return /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(path) ? path : null;
}

export function publicWorkshopImageUrl(settings: unknown, organizationId: string, supabaseUrl: string): string | null {
  const path = workshopImagePath(settings, organizationId);
  if (!path) return null;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${WORKSHOP_IMAGE_BUCKET}/${path}`;
}

/** Never accept an untrusted path outside the authenticated user's private avatar folder. */
export function ownProfileAvatarPath(rawPath: unknown, userId: string): string | null {
  if (typeof rawPath !== 'string' || !/^[a-f0-9-]{36}$/i.test(userId)) return null;
  const prefix = userId + '/';
  if (!rawPath.startsWith(prefix)) return null;
  return /^[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(rawPath.slice(prefix.length)) ? rawPath : null;
}

export function workshopImageKind(bytes: Uint8Array, mime: string) {
  if (mime === 'image/jpeg' && bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { ext: 'jpg', mime };
  if (mime === 'image/png' && bytes.length > 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v))
    return { ext: 'png', mime };
  if (mime === 'image/webp' && bytes.length > 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return { ext: 'webp', mime };
  return null;
}

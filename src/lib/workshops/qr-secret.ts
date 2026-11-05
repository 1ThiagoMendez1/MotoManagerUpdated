import { createHmac } from 'node:crypto';

/** Domain-separated key for QR OTPs. Never expose this value to the browser.
 * Use a dedicated random secret when configured. On deployments where the
 * operator already protects a high-entropy Supabase service-role JWT, derive a
 * separate HMAC key rather than requiring edits to encrypted Dokploy env.
 * If the underlying key rotates, outstanding OTPs simply expire.
 */
export function deriveWorkshopQrPepper(
  configured: string | undefined, serviceRoleKey: string | undefined,
): string | null {
  if (configured !== undefined) return configured.length >= 32 ? configured : null;
  if (!serviceRoleKey || serviceRoleKey.length < 64) return null;
  return createHmac('sha256', serviceRoleKey)
    .update('motomanager:workshop-qr-whatsapp-otp:v1')
    .digest('hex');
}

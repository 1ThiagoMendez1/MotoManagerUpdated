import 'server-only';

const listed = (value: string | undefined, id: string) =>
  Boolean(id && (value || '').split(',').map(item => item.trim()).filter(Boolean).includes(id));

// Use the authenticated user's immutable ID, never a browser-provided email or
// editable user_metadata. The organization check still applies in pilot mode.
export function managementEnabledFor(organizationId: string | null | undefined, userId: string | null | undefined): boolean {
  if (!organizationId || !userId) return false;
  const env = process.env;
  return env.WHATSAPP_COEXISTENCE_MODE === 'live' ||
    (env.WHATSAPP_COEXISTENCE_MODE === 'pilot' &&
      listed(env.WHATSAPP_COEXISTENCE_PILOT_ORGS, organizationId) &&
      listed(env.WHATSAPP_COEXISTENCE_PILOT_USERS, userId));
}

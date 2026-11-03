/** The QR OTP schema allows arbitrary slug-shaped scopes. A reserved portal
 * scope prevents login codes from consuming registration codes for a workshop.
 * This flow never enrolls the caller in a workshop. */
export const CUSTOMER_PORTAL_OTP_SCOPE = 'portal-clientes' as const;

type CustomerLink = { organization_id: string; customer_id: string };
type Workshop = { id: string };

/** Fail closed: existence of a technical account alone never enables login.
 * An authorized customer needs an actual account/customer/workshop binding,
 * and at least one linked organization must still be active. */
export function eligibleCustomerLinks(
  links: readonly CustomerLink[] | null | undefined,
  activeWorkshops: readonly Workshop[] | null | undefined,
): boolean {
  if (!links?.length || !activeWorkshops?.length) return false;
  const activeIds = new Set(activeWorkshops.map(workshop => workshop.id));
  return links.some(link =>
    Boolean(link.organization_id && link.customer_id && activeIds.has(link.organization_id))
  );
}

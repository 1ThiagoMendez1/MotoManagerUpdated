export function getTenantAwareHref(href: string): string {
  // Since we removed tenant logic, just return the href as-is
  return href;
}

export function getTenantAwareLink(href: string): string {
  return getTenantAwareHref(href);
}
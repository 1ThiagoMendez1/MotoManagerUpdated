export function getTenantAwareHref(href: string): string {
  // Since we removed tenant logic, just return the href as-is
  return href;
}

export function getTenantAwareLink(href: string): string {
  return getTenantAwareHref(href);
}

const SYSTEM_ROUTES = new Set([
  'work-orders',
  'customers',
  'motorcycles',
  'inventory',
  'sales',
  'services',
  'appointments',
  'technicians',
  'accounting',
  'dashboard',
  'team',
  'tickets',
  'planes',
  'admin',
  'login',
  'register-workshop',
  'change-password',
  'no-workshop',
  'tenant-select',
  'clientes',
  'cotizacion',
  'debug',
  'api',
]);

export function checkIsMainPage(pathname: string | null | undefined, workshopSlug?: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, '');
  if (!normalized || normalized === '/') return false;

  if (workshopSlug && (normalized === `/${workshopSlug}` || normalized === '')) {
    return true;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 1) {
    return !SYSTEM_ROUTES.has(segments[0]);
  }

  return false;
}
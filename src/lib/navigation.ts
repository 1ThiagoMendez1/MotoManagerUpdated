import { getTenantId } from './tenant';

export async function getTenantAwareHref(href: string): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) return href;

  // Don't modify admin routes or auth routes
  if (href.startsWith('/admin') || href.startsWith('/login') || href.startsWith('/register') || href.startsWith('/tenant-select')) {
    return href;
  }

  // For tenant-specific routes, prepend tenant
  if (href === '/') {
    return `/${tenantId}`;
  }

  // Remove leading slash if present and prepend tenant
  const cleanHref = href.startsWith('/') ? href.slice(1) : href;
  return `/${tenantId}/${cleanHref}`;
}

export async function getTenantAwareLink(href: string): Promise<string> {
  return getTenantAwareHref(href);
}
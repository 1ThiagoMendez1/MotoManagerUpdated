export type Role = 'owner' | 'admin' | 'mechanic' | 'receptionist' | 'service_advisor' | 'user';

export const rolePermissions: Record<Role, string[]> = {
  'owner': ['*'],
  'admin': [
    '/dashboard',
    '/motorcycles',
    '/customers',
    '/work-orders',
    '/inventory',
    '/technicians',
    '/sales',
    '/appointments',
  ], // Excludes /team (Usuarios y Permisos)
  'mechanic': [
    '/work-orders',
    '/inventory',
    '/motorcycles' // Often needed to view work order details
  ],
  'receptionist': [
    '/sales',
    '/customers',
    '/work-orders',
    '/motorcycles',
    '/appointments',
  ],
  'service_advisor': [
    '/sales',
    '/customers',
    '/work-orders',
    '/motorcycles',
    '/appointments',
  ],
  'user': [],
};

export function hasPermission(role: string, path: string) {
  const perms = rolePermissions[role as Role] || [];
  if (perms.includes('*')) return true;
  // Let the root path through always so they can see the menu
  if (path === '/') return true;
  return perms.some(p => path === p || path.startsWith(p + '/'));
}

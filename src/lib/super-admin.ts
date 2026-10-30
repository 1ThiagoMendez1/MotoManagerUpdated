type AdminIdentity = {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
};

// user_metadata is editable by the user and must never grant administrative access.
export function isSuperAdmin(user: AdminIdentity | null | undefined): boolean {
  if (!user) return false;
  return user.app_metadata?.is_super_admin === true ||
    ['juanurian31@gmail.com', 'mivraadmin@motomanager.com.co'].includes(user.email?.toLowerCase() || '');
}

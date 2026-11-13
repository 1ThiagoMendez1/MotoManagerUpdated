import 'server-only';
import { authorize, getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { hasPermission } from '@/lib/permissions';

export async function connectionOwner() {
  const user = await authorize('/dashboard/whatsapp');
  if (!['owner', 'admin'].includes(user.role)) throw new Error('Solo el propietario o administrador puede conectar WhatsApp.');
  return user;
}
export async function apiOwner() {
  const user = await getCurrentUserServer();
  if (!user || !user.workshopId || user.accessReview || (!['owner', 'admin'].includes(user.role) || !hasPermission(user.role, '/dashboard/whatsapp', user.custom_permissions))) return null;
  const workshop = await getWorkshopDetails(user);
  if (!workshop || workshop.trial_expired) return null;
  return user;
}

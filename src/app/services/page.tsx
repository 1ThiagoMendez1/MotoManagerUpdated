import { authorize } from '@/lib/auth-server';
import { getServices } from '@/actions/services';
import ServicesClient from './ServicesClient';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const user = await authorize('/services');
  const services = await getServices(user.workshopId);

  return <ServicesClient organizationId={user.workshopId} initialServices={services} />;
}

import { authorize, getWorkshopDetails } from '@/lib/auth-server';
import ServicesClient from './ServicesClient';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  await authorize('/services');
  const workshop = await getWorkshopDetails();

  return <ServicesClient organizationId={workshop?.id || ''} />;
}

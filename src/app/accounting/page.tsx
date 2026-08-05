import { authorize, getWorkshopDetails } from '@/lib/auth-server';
import AccountingClient from './AccountingClient';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  await authorize('/accounting');
  const workshop = await getWorkshopDetails();
  
  return <AccountingClient subscriptionPlan={workshop?.subscription_plan} />;
}

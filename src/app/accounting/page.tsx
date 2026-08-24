import { authorize, getWorkshopDetails } from '@/lib/auth-server';
import { getInventory, getPurchases } from '@/lib/data';
import AccountingClient from './AccountingClient';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  await authorize('/accounting');
  const workshop = await getWorkshopDetails();
  const inventoryData = await getInventory({ limit: 1000 } as any);
  const purchases = await getPurchases(workshop?.id || '');
  
  return <AccountingClient subscriptionPlan={workshop?.subscription_plan} organizationId={workshop?.id || ''} inventory={inventoryData.items} purchases={purchases} />;
}

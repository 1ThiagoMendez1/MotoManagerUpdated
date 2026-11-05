import { DashboardMenu } from '@/components/dashboard/DashboardMenu';

import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';
import { getOrderCreationOptions } from '@/lib/work-orders/order-creation-options';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface TenantPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const user = await getCurrentUserServer();
  
  if (!user) {
    redirect('/login');
  }

  const workshopDetails = await getWorkshopDetails();
  
  // Fetch data for the "Nueva Orden" modal
  const { motorcycles, technicians, unavailableMotorcycleIds } = await getOrderCreationOptions();

  return (
    <>
      <DashboardMenu 
        role={user.role} 
        customPermissions={user.custom_permissions}
        userName={workshopDetails?.user_name || 'Usuario'}
        workshopName={workshopDetails?.slug || 'tu-taller'}
        subscriptionPlan={workshopDetails?.subscription_plan}
        motorcycles={motorcycles}
        technicians={technicians}
        unavailableMotorcycleIds={unavailableMotorcycleIds}
      />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} customPermissions={user.custom_permissions} />
      </Suspense>
    </>
  );
}
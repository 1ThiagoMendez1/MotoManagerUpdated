import { DashboardMenu } from '@/components/dashboard/DashboardMenu';

import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';
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
  
  // Modal options are loaded only when the user opens it.

  return (
    <>
      <DashboardMenu 
        role={user.role} 
        customPermissions={user.custom_permissions}
        userName={workshopDetails?.user_name || 'Usuario'}
        workshopName={workshopDetails?.slug || 'tu-taller'}
        subscriptionPlan={workshopDetails?.subscription_plan}
      />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} customPermissions={user.custom_permissions} />
      </Suspense>
    </>
  );
}
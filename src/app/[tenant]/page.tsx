import { DashboardMenu } from '@/components/dashboard/DashboardMenu';

import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';
import { getMotorcycles, getTechnicians } from '@/lib/data';

export const dynamic = 'force-dynamic';

interface TenantPageProps {
  params: {
    tenant: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  // En una app real podríamos extraer información del tenant con el parámetro "tenant"
  const user = { role: 'owner' };
  const workshopDetails = { name: 'Taller Demo', user_name: 'Admin' };
  
  // Fetch data for the "Nueva Orden" modal
  const motorcycles = await getMotorcycles();
  const technicians = await getTechnicians();

  return (
    <>
      <DashboardMenu 
        role={user.role} 
        userName={workshopDetails?.user_name || 'Usuario'}
        workshopName={workshopDetails?.name || 'Tu Taller'}
        motorcycles={motorcycles}
        technicians={technicians}
      />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} />
      </Suspense>
    </>
  );
}
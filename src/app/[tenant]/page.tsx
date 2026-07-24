import { DashboardMenu } from '@/components/dashboard/DashboardMenu';

import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';
import { getMotorcycles, getTechnicians, getWorkOrders } from '@/lib/data';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface TenantPageProps {
  params: {
    tenant: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const user = await getCurrentUserServer();
  
  if (!user) {
    redirect('/login');
  }

  const workshopDetails = await getWorkshopDetails();
  
  // Fetch data for the "Nueva Orden" modal
  const [motorcycles, technicians, workOrdersData] = await Promise.all([
    getMotorcycles(),
    getTechnicians(),
    getWorkOrders()
  ]);

  const activeWorkOrders = workOrdersData.items.filter((wo) => wo.status !== 'Entregado');
  const motorcyclesWithoutActiveWorkOrders = motorcycles.filter(
    (moto) => !activeWorkOrders.some((wo) => wo.motorcycle?.id === moto.id)
  );

  return (
    <>
      <DashboardMenu 
        role={user.role} 
        userName={workshopDetails?.user_name || 'Usuario'}
        workshopName={workshopDetails?.slug || 'tu-taller'}
        motorcycles={motorcyclesWithoutActiveWorkOrders}
        technicians={technicians}
      />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} />
      </Suspense>
    </>
  );
}
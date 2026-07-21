import { DashboardMenu } from '@/components/dashboard/DashboardMenu';
import { requireWorkshop, getWorkshopDetails } from '@/lib/auth-server';
import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';
import { getMotorcycles, getTechnicians } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireWorkshop();
  const workshopDetails = await getWorkshopDetails();
  
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

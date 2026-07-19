import { DashboardMenu } from '@/components/dashboard/DashboardMenu';
import { requireWorkshop, getWorkshopDetails } from '@/lib/auth-server';
import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireWorkshop();
  const workshopDetails = await getWorkshopDetails();

  return (
    <>
      <DashboardMenu 
        role={user.role} 
        userName={workshopDetails?.user_name || 'Usuario'}
        workshopName={workshopDetails?.name || 'Tu Taller'}
      />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} />
      </Suspense>
    </>
  );
}

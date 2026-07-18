import { DashboardMenu } from '@/components/dashboard/DashboardMenu';
import { requireWorkshop } from '@/lib/auth-server';
import { Suspense } from 'react';
import { FirstLoginPasswordChangeModal } from '@/components/auth/FirstLoginPasswordChangeModal';
import { TourHandler } from '@/components/dashboard/TourHandler';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireWorkshop();

  return (
    <>
      <DashboardMenu role={user.role} />
      <Suspense fallback={null}>
        <FirstLoginPasswordChangeModal />
        <TourHandler role={user.role} />
      </Suspense>
    </>
  );
}

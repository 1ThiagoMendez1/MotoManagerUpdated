import { authorize } from '@/lib/auth-server';
import DashboardPageClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await authorize('/dashboard');
  return <DashboardPageClient />;
}

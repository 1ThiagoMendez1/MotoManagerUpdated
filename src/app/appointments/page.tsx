import { authorize } from '@/lib/auth-server';
import { getAppointments } from './actions';
import AppointmentsClient from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  await authorize('/appointments');
  const appointments = await getAppointments();

  return <AppointmentsClient initialAppointments={appointments} />;
}

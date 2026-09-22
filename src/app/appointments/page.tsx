import { authorize } from '@/lib/auth-server';
import { getAppointments } from './actions';
import { getMotorcycles, getTechnicians } from '@/lib/data';
import AppointmentsClient from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  await authorize('/appointments');
  const [appointments, motorcyclesRes, techniciansRes] = await Promise.all([
    getAppointments(),
    getMotorcycles({ limit: 1000 }),
    getTechnicians({ limit: 100 })
  ]);

  return (
    <AppointmentsClient 
      initialAppointments={appointments} 
      motorcycles={motorcyclesRes.items}
      technicians={techniciansRes.items}
    />
  );
}

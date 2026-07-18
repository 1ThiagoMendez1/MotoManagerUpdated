import { getWorkshopTickets } from '@/lib/data/tickets';
import { authorize } from '@/lib/auth-server';
import { WorkshopTicketsClient } from './WorkshopTicketsClient';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  await authorize('/tickets');
  let tickets = [];
  try {
    tickets = await getWorkshopTickets();
  } catch (error) {
    console.error('Error fetching tickets:', error);
  }

  return <WorkshopTicketsClient initialTickets={tickets} />;
}

import { getAllTicketsForAdmin } from '@/lib/data/tickets';
import { AdminTicketsClient } from './AdminTicketsClient';

export const dynamic = 'force-dynamic';

export default async function AdminTicketsPage() {
    let tickets = [];
    try {
        tickets = await getAllTicketsForAdmin();
    } catch (e) {
        console.error('Error fetching admin tickets:', e);
    }
    
    return <AdminTicketsClient initialTickets={tickets} />;
}

import { getTicketById } from '@/lib/data/tickets';
import { getTechnicians } from '@/lib/data';
import { authorize } from '@/lib/auth-server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { TicketControls } from './TicketControls';
import { TicketMessages } from './TicketMessages';

export const dynamic = 'force-dynamic';

export default async function TicketDetailsPage({ params }: { params: { id: string } }) {
  await authorize('/tickets');
  const { id } = await params;
  
  const ticket = await getTicketById(id);
  
  if (!ticket) {
    notFound();
  }

  // Fetch technicians to populate the assignment dropdown
  const technicians = await getTechnicians();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Ticket #{ticket.id.substring(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4" /> Creado el {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Messages & Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border rounded-xl bg-card">
            <h2 className="text-xl font-bold mb-2">{ticket.subject}</h2>
            <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap border border-border/50">
              {ticket.description}
            </div>
          </div>

          <h3 className="text-lg font-semibold flex items-center gap-2">
            Conversación
          </h3>
          <TicketMessages ticketId={ticket.id} messages={ticket.messages} />
        </div>

        {/* Right Column - Info & Controls */}
        <div className="space-y-6">
          <TicketControls ticket={ticket} technicians={technicians} />

          <div className="p-4 border rounded-xl bg-card space-y-4 text-sm">
            <h3 className="font-semibold text-lg border-b pb-2">Información del Cliente</h3>
            <div>
              <p className="text-muted-foreground text-xs">Nombre</p>
              <p className="font-medium">{ticket.customer?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p>{ticket.customer?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Teléfono</p>
              <p>{ticket.customer?.phone || 'N/A'}</p>
            </div>
          </div>

          {(ticket.motorcycle || ticket.work_order || ticket.sale) && (
            <div className="p-4 border rounded-xl bg-card space-y-4 text-sm">
              <h3 className="font-semibold text-lg border-b pb-2">Entidades Relacionadas</h3>
              
              {ticket.motorcycle && (
                <div>
                  <p className="text-muted-foreground text-xs">Motocicleta</p>
                  <Link href={`/motorcycles`} className="text-primary hover:underline font-medium">
                    {ticket.motorcycle.make} {ticket.motorcycle.model} - {ticket.motorcycle.plate}
                  </Link>
                </div>
              )}

              {ticket.work_order && (
                <div>
                  <p className="text-muted-foreground text-xs">Orden de Trabajo</p>
                  <Link href={`/work-orders/${ticket.work_order.id}`} className="text-primary hover:underline font-medium">
                    #{ticket.work_order.work_order_number}
                  </Link>
                </div>
              )}

              {ticket.sale && (
                <div>
                  <p className="text-muted-foreground text-xs">Factura / Venta</p>
                  <Link href={`/sales`} className="text-primary hover:underline font-medium">
                    #{ticket.sale.sale_number}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

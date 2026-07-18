import { getPublicTicketById } from '@/lib/data/tickets';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketMessages } from '@/app/tickets/[id]/TicketMessages'; // Reusing the component!

export const dynamic = 'force-dynamic';

export default async function PublicTicketPage({ params }: { params: { tenant: string, id: string } }) {
  const { tenant, id } = await params;
  
  const ticket = await getPublicTicketById(id, tenant);
  
  if (!ticket) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Abierto': return <Badge variant="destructive">Abierto</Badge>;
      case 'En Revisión': return <Badge variant="secondary">En Revisión</Badge>;
      case 'Resuelto': return <Badge variant="outline" className="text-green-500 border-green-500">Resuelto</Badge>;
      case 'Cerrado': return <Badge variant="outline">Cerrado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Detalles del Ticket</h1>
          <p className="text-muted-foreground">Soporte técnico para {ticket.customer?.name}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium">Estado actual:</span>
          {getStatusBadge(ticket.status)}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <CardDescription>
            Creado el {new Date(ticket.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap border border-border/50">
            {ticket.description}
          </div>
        </CardContent>
      </Card>

      <div className="pt-6">
        <h2 className="text-xl font-bold mb-4">Conversación</h2>
        {/* We reuse the TicketMessages component, passing isCustomer=true so they can't make internal notes */}
        <TicketMessages ticketId={ticket.id} messages={ticket.messages} isCustomer={true} />
      </div>
    </div>
  );
}

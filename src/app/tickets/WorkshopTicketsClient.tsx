'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { createTicket, getTicketMessagesWorkshop } from '@/lib/actions/tickets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Clock, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg transition-all" disabled={pending}>
      {pending ? 'Enviando...' : 'Crear Solicitud'}
    </Button>
  );
}

export function WorkshopTicketsClient({ initialTickets }: { initialTickets: any[] }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketSolutions, setTicketSolutions] = useState<Record<string, string | null>>({});
  const [loadingSolutions, setLoadingSolutions] = useState<Record<string, boolean>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const loadSolution = async (ticketId: string) => {
    if (ticketSolutions[ticketId] !== undefined) return; // already loaded or attempted
    
    setLoadingSolutions(prev => ({ ...prev, [ticketId]: true }));
    try {
      console.log(`=== CARGANDO SOLUCIÓN PARA TICKET ${ticketId} ===`);
      const msgs = await getTicketMessagesWorkshop(ticketId);
      console.log("Mensajes crudos recibidos del servidor:", msgs);

      // Find the last message that is actually from an agent (not a system event)
      const adminMsg = [...msgs].reverse().find(m => 
        (m.senderName === 'Admin' || m.senderName === 'Sistema') && 
        (m.raw_json as any)?.sender !== 'system' && 
        (m.raw_json as any)?.type !== 'event'
      );
      console.log("Mensaje identificado como solución:", adminMsg);

      setTicketSolutions(prev => ({ ...prev, [ticketId]: adminMsg ? adminMsg.message : null }));
    } catch (e) {
      console.error('Error al cargar la solución:', e);
      setTicketSolutions(prev => ({ ...prev, [ticketId]: null }));
    } finally {
      setLoadingSolutions(prev => ({ ...prev, [ticketId]: false }));
      console.log(`=== FIN CARGA SOLUCIÓN TICKET ${ticketId} ===`);
    }
  };

  const toggleExpand = (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
      loadSolution(ticketId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendiente': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 uppercase text-[10px] shadow-sm"><AlertCircle className="w-3 h-3 mr-1"/> Pendiente</Badge>;
      case 'En Revisión': return <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 uppercase text-[10px] shadow-sm"><Clock className="w-3 h-3 mr-1"/> En Revisión</Badge>;
      case 'Finalizado': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 uppercase text-[10px] shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/> Resuelto</Badge>;
      default: return <Badge className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  const handleCreateTicket = async (formData: FormData) => {
    setError(null);
    try {
      const result = await createTicket(null, formData);
      if (result?.errors) {
        const firstError = Object.values(result.errors)[0]?.[0];
        if (firstError) setError(firstError as string);
      } else if (result?.message) {
        setError(result.message);
      } else if (result?.success) {
        toast({ title: 'Solicitud enviada exitosamente' });
        setOpen(false);
      }
    } catch (e) {
      setError('Ocurrió un error inesperado.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'Todos' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getShortId = (ticket: any) => {
    const wsPrefix = ticket.workshopName ? ticket.workshopName.substring(0, 3).toUpperCase() : 'TKT';
    const idPrefix = ticket.id.split('-')[0].toUpperCase();
    return `${wsPrefix}-${idPrefix}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <PageHeader
        icon={LifeBuoy}
        iconBg="bg-primary/10 text-primary"
        title="Centro de Soporte"
        description="Gestiona tus solicitudes de soporte técnico y revisa las soluciones del equipo MotoManager."
        badge={
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {tickets.length} {tickets.length === 1 ? 'solicitud' : 'solicitudes'}
          </Badge>
        }
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-lg shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-lg">Nueva Solicitud de Soporte</DialogTitle>
                <DialogDescription className="text-xs">
                  Describe tu requerimiento o incidencia técnica de manera clara.
                </DialogDescription>
              </DialogHeader>
              <form action={handleCreateTicket} className="space-y-4 mt-2">
                {error && <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">{error}</div>}
                
                <div className="p-3 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs rounded-lg border border-blue-500/20 flex gap-2.5 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Tu solicitud será atendida en un plazo máximo de <strong>3 días hábiles</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject" className="text-xs font-semibold text-foreground">Asunto</Label>
                  <Input id="subject" name="subject" placeholder="Ej: Error al registrar venta" className="rounded-lg text-xs h-9 bg-background border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-foreground">Detalle de la solicitud</Label>
                  <Textarea id="description" name="description" placeholder="Explica lo que necesitas..." rows={4} className="rounded-lg text-xs bg-background border-border resize-none" required />
                </div>
                <SubmitButton />
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Module Toolbar with Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 rounded-xl shadow-sm">
        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg overflow-x-auto">
          {['Todos', 'Pendiente', 'En Revisión', 'Finalizado'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-background text-foreground shadow-sm font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'Finalizado' ? 'Resueltos' : f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar solicitudes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs bg-background border-border rounded-lg"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No hay solicitudes</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">No encontramos solicitudes que coincidan con tu búsqueda o filtro actual.</p>
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const isExpanded = expandedTicketId === ticket.id;
            const shortId = getShortId(ticket);
            
            return (
              <div 
                key={ticket.id} 
                className={cn(
                  "overflow-hidden transition-all duration-300 rounded-2xl border",
                  isExpanded ? "bg-card shadow-lg border-primary/20" : "bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60 hover:border-border"
                )}
              >
                {/* Card Header (Clickable) */}
                <div 
                  onClick={() => toggleExpand(ticket.id)}
                  className="p-5 flex items-center justify-between cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className={cn(
                      "flex items-center justify-center font-mono text-xs font-bold px-3 py-1.5 rounded-lg border",
                      ticket.status === 'Finalizado' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-accent text-accent-foreground border-border/50"
                    )}>
                      #{shortId}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(ticket.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    {getStatusBadge(ticket.status)}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Card Body (Expanded) */}
                <div 
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 pt-0 border-t border-border/30 mt-2 space-y-6">
                      
                      {/* Problema */}
                      <div className="space-y-2 mt-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Descripción de la solicitud
                        </h4>
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-sm whitespace-pre-wrap leading-relaxed">
                          {ticket.description}
                        </div>
                      </div>

                      {/* Solución */}
                      {ticket.status === 'Finalizado' && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Solución aplicada
                          </h4>
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                            {loadingSolutions[ticket.id] ? (
                              <span className="flex items-center gap-2 text-muted-foreground animate-pulse">
                                Cargando solución...
                              </span>
                            ) : ticketSolutions[ticket.id] ? (
                              ticketSolutions[ticket.id]
                            ) : (
                              <span className="text-muted-foreground italic">No se ha registrado un texto de solución para esta solicitud.</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

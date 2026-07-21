'use client';

import { useState, useEffect } from 'react';
import { updateAdminTicketStatus, replyToTicketAdmin, getTicketMessagesAdmin } from '@/lib/actions/tickets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Send, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function AdminTicketsClient({ initialTickets }: { initialTickets: any[] }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const [solutionText, setSolutionText] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [existingSolution, setExistingSolution] = useState<string | null>(null);
  const [isLoadingSolution, setIsLoadingSolution] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  useEffect(() => {
    if (selectedTicketId) {
      loadSolution(selectedTicketId);
    } else {
      setExistingSolution(null);
      setSolutionText('');
    }
  }, [selectedTicketId]);

  const loadSolution = async (ticketId: string) => {
    setIsLoadingSolution(true);
    setExistingSolution(null);
    try {
      const msgs = await getTicketMessagesAdmin(ticketId);
      const adminMsg = msgs.find(m => m.senderName === 'Admin' || m.senderName === 'Sistema');
      if (adminMsg && adminMsg.message) {
        setExistingSolution(adminMsg.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSolution(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    // Update local state first for optimistic UI
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    
    const result = await updateAdminTicketStatus(ticketId, newStatus);
    if (!result.success) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
      // Revert on error could be implemented here
    } else {
      toast({ title: "Estado Actualizado", description: `El ticket ahora está ${newStatus}` });
    }
  };

  const handleSolve = async () => {
    if (!selectedTicketId || !solutionText.trim()) return;
    setIsSolving(true);
    
    try {
      console.log("=== FINALIZAR TICKET BUTTON CLICKED ===");
      console.log("Selected ticket:", selectedTicketId);
      console.log("New message:", solutionText);

      // 1. Reply to ticket to save the solution text in ticket_messages (no functional change)
      const res = await replyToTicketAdmin(selectedTicketId, solutionText);
      console.log("Resultado de replyToTicketAdmin:", res);
      
      if (!res.success) {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
        setIsSolving(false);
        return;
      }

      console.log("Cambiando estado a Finalizado...");
      // 2. Update status to Finalizado
      const updateRes = await updateAdminTicketStatus(selectedTicketId, 'Finalizado');
      console.log("Estado cambiado exitosamente:", updateRes);

      if (!updateRes.success) {
        toast({ title: 'Error', description: updateRes.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ticket Resuelto', description: 'La solución ha sido enviada al taller.' });
        // Update local state
        setTickets(prev => prev.map(t => t.id === selectedTicketId ? { ...t, status: 'Finalizado' } : t));
        setExistingSolution(solutionText);
        setSolutionText('');
      }
    } catch (error) {
      console.error("Excepción durante el envío:", error);
      toast({ title: 'Error', description: 'Error al enviar la solución', variant: 'destructive' });
    } finally {
      setIsSolving(false);
      console.log("=== FINALIZAR TICKET PROCESS COMPLETED ===");
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

  const getShortId = (ticket: any) => {
    const wsPrefix = ticket.workshopName ? ticket.workshopName.substring(0, 3).toUpperCase() : 'TKT';
    const idPrefix = ticket.id.split('-')[0].toUpperCase();
    return `${wsPrefix}-${idPrefix}`;
  };

  const filteredTickets = tickets.filter(t => {
    const searchMatch = t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.workshopName?.toLowerCase().includes(searchQuery.toLowerCase());
    const filterMatch = filter === 'Todos' || (filter === 'Resueltos' ? t.status === 'Finalizado' : t.status === filter);
    return searchMatch && filterMatch;
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] -mt-4 bg-background overflow-hidden border border-border/40 rounded-xl shadow-lg">
      
      {/* Left Sidebar: Inbox */}
      <div className={cn(
        "w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col border-r border-border bg-card/30 backdrop-blur-sm",
        selectedTicketId ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-5 border-b border-border/50 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Panel de Soporte</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Gestión de tickets de talleres</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-sm px-3 rounded-full">{filteredTickets.length}</Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por asunto o taller..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-1 transition-all h-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['Todos', 'Pendiente', 'En Revisión', 'Resueltos'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all",
                  filter === f 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className={cn(
                "p-4 border-b border-border/30 cursor-pointer transition-all duration-200 hover:bg-card/60 relative",
                selectedTicketId === ticket.id ? "bg-card shadow-sm border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-mono text-[10px] font-bold px-2 py-0.5 rounded border",
                    ticket.status === 'Finalizado' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-accent text-accent-foreground border-border/50"
                  )}>
                    #{getShortId(ticket)}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {ticket.workshopName}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(ticket.createdAt), "d MMM", { locale: es })}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-2 text-foreground/90 truncate">{ticket.subject}</h3>
              <div className="flex items-center justify-between">
                {getStatusBadge(ticket.status)}
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 border border-border/50">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-base font-semibold text-foreground">Bandeja limpia</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No hay tickets que requieran tu atención con estos filtros.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Resolution Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-card/10 relative",
        !selectedTicketId ? "hidden lg:flex items-center justify-center" : "flex"
      )}>
        {!selectedTicketId ? (
          <div className="text-center max-w-md p-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-inner border border-primary/20">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Resolución Rápida</h3>
            <p className="text-sm text-muted-foreground">Selecciona una solicitud del panel lateral para revisarla y proporcionar una solución al taller.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-border/50 bg-card/60 backdrop-blur-md shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex items-start gap-4">
                <button 
                  className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-lg bg-muted/50 mt-1"
                  onClick={() => setSelectedTicketId(null)}
                >
                  <Search className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-accent text-accent-foreground border border-border/50 shadow-sm">
                      #{getShortId(selectedTicket)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 gap-2 border-border/50 hover:bg-accent/50 text-[10px] uppercase shadow-sm">
                          Cambiar Estado <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        {['Pendiente', 'En Revisión', 'Finalizado'].map(s => (
                          <DropdownMenuItem 
                            key={s} 
                            onClick={() => handleStatusChange(selectedTicket!.id, s)}
                            className={selectedTicket?.status === s ? "bg-accent font-semibold" : ""}
                          >
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {getStatusBadge(selectedTicket?.status || '')}
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-2">{selectedTicket?.subject}</h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1 font-medium text-foreground/70"><Building2 className="w-3.5 h-3.5" /> {selectedTicket?.workshopName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedTicket?.createdAt ? format(new Date(selectedTicket.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es }) : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gradient-to-b from-transparent to-muted/20">
              
              {/* Problem Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive/70" /> 
                  Problema Reportado
                </h4>
                <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedTicket?.description}
                </div>
              </div>

              {/* Solution Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/70" /> 
                  Solución
                </h4>
                
                {isLoadingSolution ? (
                   <div className="p-8 rounded-2xl bg-card border border-border/60 shadow-sm flex items-center justify-center">
                     <span className="animate-pulse text-muted-foreground text-sm font-medium">Obteniendo información...</span>
                   </div>
                ) : selectedTicket?.status === 'Finalizado' ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {existingSolution || <span className="italic text-muted-foreground">Solución aplicada pero no se registró texto.</span>}
                  </div>
                ) : (
                  <div className="p-1 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/60 shadow-lg relative focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all duration-300">
                    <Textarea
                      value={solutionText}
                      onChange={(e) => setSolutionText(e.target.value)}
                      placeholder="Describe la solución detallada aquí..."
                      className="min-h-[160px] bg-transparent border-0 focus-visible:ring-0 resize-none p-5 text-[15px] leading-relaxed"
                    />
                    <div className="p-4 border-t border-border/40 bg-card/50 rounded-b-2xl flex justify-end">
                      <Button 
                        onClick={handleSolve} 
                        disabled={isSolving || !solutionText.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all px-6 gap-2 rounded-xl"
                      >
                        {isSolving ? 'Procesando...' : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Resolver Ticket
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}

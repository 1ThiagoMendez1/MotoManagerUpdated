'use client';

import { useState, useEffect, useRef } from 'react';

import { updateAdminTicketStatus, replyToTicketAdmin, getTicketMessagesAdmin } from '@/lib/actions/tickets';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Send, Clock, CheckCircle2, AlertCircle, X, Store, User, Mail, PlusCircle, MoreVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  workshopName: string;
  creatorName: string;
}

interface Message {
  id: string;
  message: string;
  createdAt: string;
  senderId: string | null;
  senderName: string;
}

export default function TicketsTab({ initialTickets }: { initialTickets: Ticket[] }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Load initial messages when ticket is selected
  useEffect(() => {
    if (!selectedTicket) return;
    
    let isMounted = true;
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      const msgs = await getTicketMessagesAdmin(selectedTicket.id);
      if (isMounted) {
        setMessages(msgs);
        setIsLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      }
    };
    fetchMessages();

    return () => { isMounted = false; };
  }, [selectedTicket?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Supabase Realtime subscriptions
  useEffect(() => {
    // Escuchar nuevos tickets o cambios de estado
    const ticketsChannel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        // En producción sería ideal volver a cargar la lista completa o mutar el estado con cuidado
        // Aquí hacemos una recarga parcial o simulada:
        if (payload.eventType === 'INSERT') {
          // Asumimos que no tenemos workshopName, por lo que podríamos recargar la página o hacer un fetch
          // Por simplicidad, agregamos un ticket "incompleto" y le pedimos al usuario refrescar,
          // o podemos hacer refetch. Haremos un refetch simple de la página con router.refresh() 
          // pero como estamos en un Client Component, mostraremos un Toast.
          toast({
            title: "Nuevo Ticket Recibido",
            description: "Se ha creado un nuevo ticket de soporte.",
          });
        }
      })
      .subscribe();

    // Escuchar nuevos mensajes para el ticket seleccionado
    const messagesChannel = supabase
      .channel('public:ticket_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, (payload) => {
        const newMsg = payload.new;
        if (selectedTicket && newMsg.ticket_id === selectedTicket.id) {
          let parsed = { text: newMsg.message, sender: 'agent', isInternal: false };
          try {
            if (newMsg.message.startsWith('{')) {
              parsed = JSON.parse(newMsg.message);
            }
          } catch(e) {}

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              message: parsed.text || newMsg.message,
              createdAt: newMsg.created_at,
              senderId: newMsg.sender_id,
              senderName: parsed.sender === 'user' ? 'Cliente' : 'Admin',
            }];
          });
          setTimeout(scrollToBottom, 100);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [supabase, selectedTicket, toast]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const result = await updateAdminTicketStatus(selectedTicket.id, newStatus);
      if (result?.success) {
        setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
        setSelectedTicket({ ...selectedTicket, status: newStatus });
        toast({
          title: "Estado Actualizado",
          description: `El ticket ahora está "${newStatus}".`,
        });
      } else {
        toast({
          title: "Error",
          description: result?.message || "Error al actualizar el ticket.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error de servidor",
        description: error.message || "Hubo un error al conectar con el servidor",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const result = await replyToTicketAdmin(selectedTicket.id, newMessage);
      if (result?.success) {
        setMessages(prev => [...prev, {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
          message: newMessage,
          createdAt: new Date().toISOString(),
          senderId: null,
          senderName: 'Admin',
        }]);
        setTimeout(scrollToBottom, 100);
        setNewMessage('');
      } else {
        toast({
          title: "Error",
          description: result?.message || "No se pudo enviar el mensaje",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      toast({
        title: "Error de servidor",
        description: e.message || 'Hubo un error al conectar con el servidor',
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'En Revisión': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Finalizado': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendiente': return <AlertCircle className="w-4 h-4" />;
      case 'En Revisión': return <Clock className="w-4 h-4" />;
      case 'Finalizado': return <CheckCircle2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredTickets = tickets
    .filter(t => filter === 'Todos' || t.status === filter)
    .filter(t => 
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.workshopName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="flex h-[800px] max-h-[85vh] w-full rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
      
      {/* Left Panel: Ticket List */}
      <div className={`w-full md:w-1/3 flex flex-col border-r border-border bg-background/50 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Bandeja de Entrada</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {tickets.length} total
            </span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar tickets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['Todos', 'Pendiente', 'En Revisión', 'Finalizado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted hover:bg-muted-foreground/10 text-muted-foreground border border-border'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <Mail className="w-12 h-12 mb-4 opacity-20" />
              <p>No hay tickets que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${selectedTicket?.id === ticket.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">{ticket.subject}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Store className="w-3 h-3" />
                    <span className="truncate">{ticket.workshopName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Ticket Detail & Chat */}
      <div className={`flex-1 flex flex-col bg-card relative ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        {!selectedTicket ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/50 p-8">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <Mail className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground/50 mb-2">Soporte y Tickets</h2>
            <p className="max-w-md">Selecciona un ticket de la lista izquierda para ver los detalles, cambiar su estado y responder al cliente en tiempo real.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-border bg-card/50 backdrop-blur-md gap-4 z-10 shadow-sm">
              <div className="flex items-start gap-4">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="md:hidden mt-1 p-1.5 bg-muted rounded-full text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">{selectedTicket.subject}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                      <Store className="w-3.5 h-3.5" /> {selectedTicket.workshopName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {selectedTicket.creatorName}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(selectedTicket.createdAt), "d MMM yyyy, h:mm a")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Estado:</span>
                <div className="flex bg-muted p-1 rounded-lg">
                  {['Pendiente', 'En Revisión', 'Finalizado'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedTicket.status === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ticket Details & Solution Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5 flex flex-col gap-6">
              
              {/* Original Ticket Description */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center border border-primary/30">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1 w-full max-w-4xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{selectedTicket.creatorName}</span>
                    <span className="text-xs text-muted-foreground">Taller original</span>
                  </div>
                  <div className="bg-card border border-border p-5 rounded-2xl rounded-tl-none shadow-sm text-foreground text-sm whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>
              </div>

              {/* Soluciones previas (si existen) */}
              {isLoadingMessages ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                messages.filter(msg => msg.senderName === 'Admin').map(msg => (
                  <div key={msg.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex flex-col gap-1 w-full max-w-4xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-emerald-500">Solución (Admin)</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), "d MMM, h:mm a")}</span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl rounded-tl-none shadow-sm text-foreground text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Solution Input */}
            {selectedTicket.status !== 'Finalizado' ? (
              <div className="p-6 bg-card border-t border-border">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    console.log("=== FINALIZAR TICKET BUTTON CLICKED ===");
                    console.log("Selected ticket:", selectedTicket?.id);
                    console.log("New message:", newMessage);
                    console.log("Is sending:", isSending);

                    if (!newMessage.trim() || isSending || !selectedTicket) {
                      console.log("Submission aborted: empty message, already sending, or no ticket selected.");
                      return;
                    }
                    
                    const messageToSend = newMessage.trim();
                    setIsSending(true);
                    
                    try {
                      console.log("Enviando solución al backend...");
                      // 1. Enviar el mensaje
                      const result = await replyToTicketAdmin(selectedTicket.id, messageToSend);
                      console.log("Resultado de replyToTicketAdmin:", result);

                      if (result?.success) {
                        // Actualizar localmente de inmediato para mayor rapidez (el realtime también lo hará)
                        setMessages(prev => [...prev, {
                          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
                          message: messageToSend,
                          createdAt: new Date().toISOString(),
                          senderId: null,
                          senderName: 'Admin',
                        }]);
                        setNewMessage('');
                        
                        console.log("Cambiando estado a Finalizado...");
                        // 2. Cambiar estado a finalizado
                        await handleStatusChange('Finalizado');
                        console.log("Estado cambiado exitosamente.");
                      } else {
                        console.error("Error al enviar solución:", result);
                        toast({ title: 'Error', description: result?.message || 'Error al enviar la solución', variant: 'destructive' });
                      }
                    } catch(err: any) {
                      console.error("Excepción durante el envío:", err);
                      toast({ title: 'Error de servidor', description: err.message, variant: 'destructive' });
                    } finally {
                      setIsSending(false);
                      console.log("=== FINALIZAR TICKET PROCESS COMPLETED ===");
                    }
                  }} 
                  className="flex flex-col gap-3 max-w-4xl mx-auto"
                >
                  <label className="text-sm font-semibold text-foreground">Dar Solución y Finalizar Ticket</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Describe la solución dada al problema..."
                    className="w-full min-h-[100px] bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  />
                  <div className="flex justify-end gap-3 mt-2">
                    <button 
                      type="button"
                      onClick={() => handleStatusChange('En Revisión')}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                    >
                      Marcar en Revisión
                    </button>
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim() || isSending}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <CheckCircle2 className="w-4 h-4" />}
                      Finalizar Ticket
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-card border-t border-border text-center">
                <p className="text-sm text-emerald-500 font-medium">
                  Este ticket ha sido finalizado. Si necesitas añadir otra solución, cambia el estado a "En Revisión".
                </p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

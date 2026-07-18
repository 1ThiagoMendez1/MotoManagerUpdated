'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateAdminTicketStatus, replyToTicketAdmin, getTicketMessagesAdmin } from '@/lib/actions/tickets';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Send, Clock, CheckCircle2, AlertCircle, X, Store, User, Mail, PlusCircle, MoreVertical } from 'lucide-react';

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
  }, [selectedTicket]);

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
    const result = await updateAdminTicketStatus(selectedTicket.id, newStatus);
    if (result.success) {
      setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
      setSelectedTicket({ ...selectedTicket, status: newStatus });
      toast({
        title: "Estado Actualizado",
        description: `El ticket ahora está "${newStatus}".`,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const result = await replyToTicketAdmin(selectedTicket.id, newMessage);
      if (result.success) {
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
          description: result.message,
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

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5 flex flex-col gap-6">
              
              {/* Original Ticket Description as First Message */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center border border-primary/30">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{selectedTicket.creatorName}</span>
                    <span className="text-xs text-muted-foreground">Taller original</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-sm text-foreground text-sm whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>
              </div>

              {isLoadingMessages ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                messages.map(msg => {
                  const isAdmin = !msg.senderId; // null implies admin/system
                  return (
                    <div key={msg.id} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center border ${isAdmin ? 'bg-blue-600 border-blue-500' : 'bg-primary/20 border-primary/30'}`}>
                        {isAdmin ? <div className="text-white font-bold text-xs">A</div> : <User className="w-5 h-5 text-primary" />}
                      </div>
                      <div className={`flex flex-col gap-1 max-w-[80%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{msg.senderName}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), "h:mm a")}</span>
                        </div>
                        <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu respuesta como Administrador..."
                  disabled={selectedTicket.status === 'Finalizado'}
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || isSending || selectedTicket.status === 'Finalizado'}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isSending ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Send className="w-5 h-5" />}
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
              {selectedTicket.status === 'Finalizado' && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Este ticket está finalizado. Cambia el estado a "En Revisión" para enviar más mensajes.
                </p>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

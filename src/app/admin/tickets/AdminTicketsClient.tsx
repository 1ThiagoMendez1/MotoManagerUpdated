'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateAdminTicketStatus, replyToTicketAdmin, getTicketMessagesAdmin } from '@/lib/actions/tickets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Send, 
  Clock, 
  User, 
  Check, 
  CheckCheck,
  MoreVertical,
  CircleDot
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

export function AdminTicketsClient({ initialTickets }: { initialTickets: any[] }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId);
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    const supabase = createClient();
    
    const ticketsChannel = supabase.channel('admin_tickets_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, (payload) => {
        // Handle insert locally if needed, for now just wait for reload or optimistically add
      })
      .subscribe();

    let messagesChannel: any = null;
    if (selectedTicketId) {
      messagesChannel = supabase.channel(`admin_ticket_${selectedTicketId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicketId}`
        }, (payload) => {
          const newMsg = payload.new;
          let parsed = { text: newMsg.message, sender: 'agent', type: 'message' };
          try {
            if (newMsg.message.startsWith('{')) parsed = JSON.parse(newMsg.message);
          } catch(e) {}
          
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              message: parsed.text || newMsg.message,
              createdAt: newMsg.created_at,
              senderId: newMsg.sender_id,
              senderName: parsed.sender === 'user' ? 'Cliente' : parsed.sender === 'system' ? 'Sistema' : 'Admin',
              type: parsed.type || 'message'
            }];
          });
          
          if (parsed.sender === 'user') {
            toast({ title: 'Nuevo mensaje recibido', description: selectedTicket?.workshopName });
          }
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(ticketsChannel);
      if (messagesChannel) supabase.removeChannel(messagesChannel);
    };
  }, [selectedTicketId, selectedTicket, toast]);

  const loadMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const msgs = await getTicketMessagesAdmin(ticketId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudieron cargar los mensajes', variant: 'destructive' });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    
    const result = await updateAdminTicketStatus(ticketId, newStatus);
    if (!result.success) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    const text = replyText;
    setReplyText('');
    setIsReplying(true);
    
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const newMsg = {
      id: tempId,
      message: text,
      createdAt: new Date().toISOString(),
      senderId: 'admin',
      senderName: 'Admin',
      type: 'message'
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      const res = await replyToTicketAdmin(selectedTicketId, text);
      if (!res.success) {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al enviar', variant: 'destructive' });
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendiente': return <Badge variant="destructive" className="uppercase text-[10px]">Pendiente</Badge>;
      case 'En Revisión': return <Badge variant="secondary" className="uppercase text-[10px]">En Revisión</Badge>;
      case 'Esperando cliente': return <Badge variant="outline" className="uppercase text-[10px] text-amber-500 border-amber-500">Esperando cliente</Badge>;
      case 'Finalizado': return <Badge variant="outline" className="uppercase text-[10px] text-emerald-500 border-emerald-500">Finalizado</Badge>;
      default: return <Badge className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return `Hoy ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Ayer ${format(date, 'h:mm a')}`;
    return format(date, 'd MMM yyyy h:mm a', { locale: es });
  };

  const filteredTickets = tickets.filter(t => {
    const searchMatch = t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.workshopName?.toLowerCase().includes(searchQuery.toLowerCase());
    const filterMatch = filter === 'Todos' || t.status === filter;
    return searchMatch && filterMatch;
  });

  const chatMessages = messages.filter(m => m.type !== 'event');

  return (
    <div className="flex h-[calc(100vh-6rem)] -mt-4 bg-background overflow-hidden border border-border/40 rounded-xl shadow-lg">
      
      {/* Left Sidebar: Inbox */}
      <div className={cn(
        "w-full lg:w-[320px] xl:w-[380px] flex-shrink-0 flex flex-col border-r border-border bg-card/30",
        selectedTicketId ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Inbox</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary rounded-full px-2">{filteredTickets.length}</Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-1 transition-all h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['Todos', 'Pendiente', 'En Revisión', 'Esperando cliente', 'Finalizado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
                  filter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                "p-4 border-b border-border/30 cursor-pointer transition-all duration-200 hover:bg-accent/40 relative",
                selectedTicketId === ticket.id ? "bg-accent/40" : ""
              )}
            >
              {selectedTicketId === ticket.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[13px] truncate pr-2">{ticket.workshopName}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center">
                  {format(new Date(ticket.createdAt), 'MMM d', { locale: es })}
                </span>
              </div>
              <h3 className="font-medium text-sm mb-1.5 truncate text-foreground/90">{ticket.subject}</h3>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground line-clamp-1 flex-1 pr-4">
                  {ticket.description}
                </p>
                {getStatusBadge(ticket.status)}
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <CheckCheck className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Todo al día</p>
              <p className="text-xs text-muted-foreground mt-1">No hay tickets en esta vista.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-card/10 relative",
        !selectedTicketId ? "hidden lg:flex items-center justify-center" : "flex"
      )}>
        {!selectedTicketId ? (
          <div className="text-center max-w-md p-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CircleDot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2 tracking-tight">Inbox de Soporte</h3>
            <p className="text-sm text-muted-foreground">Selecciona un ticket de la barra lateral para ver la conversación y el historial.</p>
          </div>
        ) : (
          <>
            <div className="h-16 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <button 
                  className="lg:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
                  onClick={() => setSelectedTicketId(null)}
                >
                  <Search className="w-5 h-5" />
                  <span className="text-sm ml-1">Volver</span>
                </button>
                <div className="truncate">
                  <h2 className="font-semibold text-sm truncate">{selectedTicket?.subject}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground/80">{selectedTicket?.workshopName}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{selectedTicket?.creatorName}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-border/50 hover:bg-accent/50 text-xs shadow-sm">
                      {getStatusBadge(selectedTicket?.status || '')}
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Cambiar Estado</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {['Pendiente', 'En Revisión', 'Esperando cliente', 'Finalizado'].map(s => (
                      <DropdownMenuItem 
                        key={s} 
                        onClick={() => handleStatusChange(selectedTicket!.id, s)}
                        className={selectedTicket?.status === s ? "bg-accent" : ""}
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-fixed bg-opacity-5">
              
              <div className="flex justify-center my-4">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 bg-background/60 px-3 py-1 rounded-full">
                  Inicio de la conversación
                </span>
              </div>

              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-muted border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[75%]">
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs font-medium text-foreground/80">{selectedTicket?.creatorName}</span>
                    <span className="text-[10px] text-muted-foreground">{selectedTicket?.createdAt ? formatMessageTime(selectedTicket.createdAt) : ''}</span>
                  </div>
                  <div className="bg-muted/80 text-foreground p-3.5 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-sm border border-border/30 whitespace-pre-wrap">
                    {selectedTicket?.description}
                  </div>
                </div>
              </div>

              {isLoadingMessages ? (
                <div className="flex justify-center py-10">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isAdmin = msg.senderName === 'Admin' || msg.senderName === 'Sistema';
                  const isLast = i === chatMessages.length - 1;
                  
                  return (
                    <div key={msg.id} className={cn("flex gap-3", isAdmin ? "justify-end" : "justify-start")}>
                      {!isAdmin && (
                        <div className="w-7 h-7 rounded-full bg-muted border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className={cn("flex flex-col gap-1 max-w-[85%] md:max-w-[75%]", isAdmin ? "items-end" : "items-start")}>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-medium text-foreground/80">
                            {isAdmin ? 'Tú (Soporte)' : msg.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatMessageTime(msg.createdAt)}</span>
                        </div>
                        
                        <div className={cn(
                          "p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap",
                          isAdmin 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-muted/80 text-foreground border border-border/30 rounded-tl-sm"
                        )}>
                          {msg.message}
                        </div>
                        
                        {isAdmin && isLast && (
                          <div className="flex items-center gap-1 pr-1 opacity-70">
                            <span className="text-[10px] text-muted-foreground">Enviado</span>
                            <CheckCheck className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md">
              <div className="flex items-end gap-2 bg-background border border-border/60 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responde al cliente..."
                  className="min-h-[44px] max-h-32 bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-3 text-[13px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                  }}
                />
                <Button 
                  size="icon" 
                  onClick={handleReply} 
                  disabled={isReplying || !replyText.trim()}
                  className="rounded-lg h-[44px] w-[44px] shrink-0 shadow-sm transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="font-medium">Enter</span> enviar • <span className="font-medium">Shift+Enter</span> nueva línea
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedTicketId && (
        <div className="hidden xl:flex w-[280px] flex-shrink-0 flex-col border-l border-border bg-card/30">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Historial del Ticket</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 relative">
            
            <div className="absolute left-[29px] top-6 bottom-6 w-px bg-border" />
            
            <div className="space-y-6 relative z-10">
              
              <div className="flex gap-4">
                <div className="w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Ticket Creado</span>
                  <span className="text-[10px] text-muted-foreground">{selectedTicket?.createdAt ? formatMessageTime(selectedTicket.createdAt) : ''}</span>
                </div>
              </div>

              {messages.map(msg => {
                if (msg.type === 'event') {
                  return (
                    <div key={msg.id} className="flex gap-4">
                      <div className="w-5 h-5 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{msg.message}</span>
                        <span className="text-[10px] text-muted-foreground">{formatMessageTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="flex gap-4 opacity-75">
                      <div className="w-5 h-5 rounded-full bg-background border-2 border-muted-foreground/20 flex items-center justify-center shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-foreground/80">
                          {msg.senderName === 'Admin' || msg.senderName === 'Sistema' ? 'Soporte respondió' : 'Cliente respondió'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatMessageTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                }
              })}
              
              <div className="flex gap-4 pt-2">
                <div className="w-5 h-5 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Estado Actual:</span>
                  <div className="mt-1">{getStatusBadge(selectedTicket?.status || '')}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

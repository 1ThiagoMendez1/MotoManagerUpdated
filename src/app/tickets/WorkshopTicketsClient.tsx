'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useFormStatus } from 'react-dom';
import { createTicket, replyToTicketWorkshop, getTicketMessagesWorkshop } from '@/lib/actions/tickets';
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
import { PlusCircle, Search, Send, Clock, User, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Enviando...' : 'Reportar Problema'}
    </Button>
  );
}

export function WorkshopTicketsClient({ initialTickets }: { initialTickets: any[] }) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    setTickets(initialTickets);
  }, [initialTickets]);

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedTicketId) return;
    const supabase = createClient();
    const channel = supabase.channel(`workshop_ticket_${selectedTicketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${selectedTicketId}`
      }, (payload) => {
        const newMsg = payload.new;
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicketId]);

  const loadMessages = async () => {
    if (!selectedTicketId) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await getTicketMessagesWorkshop(selectedTicketId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendiente': return <Badge variant="destructive" className="uppercase text-[10px]">Pendiente</Badge>;
      case 'En Revisión': return <Badge variant="secondary" className="uppercase text-[10px]">En Revisión</Badge>;
      case 'Finalizado': return <Badge variant="outline" className="uppercase text-[10px] text-green-500 border-green-500">Finalizado</Badge>;
      default: return <Badge className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  const handleCreateTicket = async (formData: FormData) => {
    setError(null);
    try {
      const result = await createTicket(null, formData);
      if (result?.errors) {
        const firstError = Object.values(result.errors)[0]?.[0];
        if (firstError) setError(firstError);
      } else if (result?.message) {
        setError(result.message);
      } else if (result?.success) {
        toast({ title: 'Ticket creado exitosamente' });
        setOpen(false);
      }
    } catch (e) {
      setError('Ocurrió un error inesperado.');
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setIsReplying(true);
    try {
      const res = await replyToTicketWorkshop(selectedTicketId, replyText);
      if (res.success) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          message: replyText,
          createdAt: new Date().toISOString(),
          senderId: 'user', // optimistic
          senderName: 'Cliente',
        }]);
        setReplyText('');
      } else {
        toast({ title: 'Error', description: res.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje', variant: 'destructive' });
    } finally {
      setIsReplying(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'Todos' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] -mt-4 bg-background overflow-hidden border border-border rounded-xl">
      
      {/* Left Panel: Inbox */}
      <div className={cn(
        "w-full lg:w-[350px] flex-shrink-0 flex flex-col border-r border-border bg-card/30",
        selectedTicketId ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Bandeja de Entrada</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{tickets.length} total</Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['Todos', 'Pendiente', 'En Revisión', 'Finalizado'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full text-sm h-9" variant="outline">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nuevo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Ticket de Soporte</DialogTitle>
                <DialogDescription>
                  Describe detalladamente el problema que estás experimentando para que nuestro equipo lo revise.
                </DialogDescription>
              </DialogHeader>
              <form action={handleCreateTicket} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input id="subject" name="subject" placeholder="Ej: Problema con inventario" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción detallada</Label>
                  <Textarea id="description" name="description" placeholder="Explica exactamente lo que sucede..." rows={5} required />
                </div>
                <SubmitButton />
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className={cn(
                "p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/50",
                selectedTicketId === ticket.id ? "bg-accent/50 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(ticket.status)}
                <span className="text-[10px] text-muted-foreground flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1 truncate">{ticket.subject}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay tickets que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-card relative",
        !selectedTicketId ? "hidden lg:flex items-center justify-center" : "flex"
      )}>
        {!selectedTicketId ? (
          <div className="text-center max-w-md p-6">
            <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Soporte MotoManager</h3>
            <p className="text-muted-foreground">Selecciona un ticket de la bandeja de entrada para ver el historial y conversar con el equipo de soporte.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/80 backdrop-blur-sm z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <button 
                  className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedTicketId(null)}
                >
                  ← Atrás
                </button>
                <div>
                  <h2 className="font-bold text-lg">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {selectedTicket.creatorName}</span>
                    <span>•</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">ESTADO:</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Original Description as first message */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{selectedTicket.creatorName}</span>
                    <span className="text-xs text-muted-foreground">Taller (Tú)</span>
                  </div>
                  <div className="bg-muted text-foreground p-3 sm:p-4 rounded-2xl rounded-tl-none border border-border/50 text-sm whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>
              </div>

              {isLoadingMessages ? (
                <div className="flex justify-center p-4">
                  <span className="text-xs text-muted-foreground animate-pulse">Cargando mensajes...</span>
                </div>
              ) : (
                messages.map(msg => {
                  const isAdmin = msg.senderName === 'Admin';
                  return (
                    <div key={msg.id} className={cn("flex gap-4", isAdmin ? "" : "")}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isAdmin ? "bg-red-500/20 text-red-500" : "bg-primary/20 text-primary"
                      )}>
                        {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{isAdmin ? 'Soporte MotoManager' : selectedTicket.creatorName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className={cn(
                          "p-3 sm:p-4 rounded-2xl border text-sm whitespace-pre-wrap",
                          isAdmin 
                            ? "bg-accent/50 text-accent-foreground border-accent rounded-tl-none" 
                            : "bg-muted text-foreground border-border/50 rounded-tl-none"
                        )}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-end gap-2 bg-background border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="min-h-[44px] max-h-32 bg-transparent border-0 focus-visible:ring-0 resize-none py-3"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  onClick={handleReply} 
                  disabled={isReplying || !replyText.trim()}
                  className="rounded-lg h-11 w-11 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Presiona Enter para enviar, o Shift + Enter para salto de línea.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addTicketMessage } from '@/lib/actions/tickets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

export function TicketMessages({ ticketId, messages, isCustomer = false }: { ticketId: string, messages: any[], isCustomer?: boolean }) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>(messages);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`ticket_${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, (payload) => {
        const newMsg = payload.new;
        let parsed = { text: newMsg.message, sender: 'agent', guide_number: '', isInternal: false };
        try {
          if (newMsg.message.startsWith('{')) {
            parsed = JSON.parse(newMsg.message);
          }
        } catch(e) {}
        
        const formattedMsg = {
          id: newMsg.id,
          message: parsed.text || newMsg.message,
          createdAt: newMsg.created_at,
          senderId: newMsg.sender_id,
          senderName: parsed.sender === 'user' ? 'Cliente' : 'Admin',
          senderEmail: '',
          is_internal: parsed.isInternal || false,
          raw_json: parsed
        };
        
        setLocalMessages(prev => {
          if (prev.find(m => m.id === formattedMsg.id)) return prev;
          return [...prev, formattedMsg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('ticketId', ticketId);
    formData.append('message', message);
    formData.append('isCustomer', isCustomer.toString());
    if (!isCustomer) formData.append('isInternal', isInternal.toString());

    const result = await addTicketMessage(null, formData);
    
    if (result.success) {
      // Optimistic update
      const newMsg = {
        id: crypto.randomUUID(),
        message: message,
        createdAt: new Date().toISOString(),
        senderId: null,
        senderName: isCustomer ? 'Cliente' : 'Admin',
        senderEmail: '',
        is_internal: isInternal,
        raw_json: {
          text: message,
          sender: isCustomer ? 'user' : 'agent',
          guide_number: '',
          isInternal
        }
      };
      setLocalMessages(prev => [...prev, newMsg]);
      
      setMessage('');
      setIsInternal(false);
      toast({ title: 'Mensaje enviado' });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4 max-h-[500px] overflow-y-auto p-4 border rounded-xl bg-card/50">
        {localMessages.length === 0 ? (
          <p className="text-center text-muted-foreground">No hay mensajes en este ticket todavía.</p>
        ) : (
          localMessages.map((msg) => (
            <div key={msg.id} className={`p-4 rounded-xl border ${msg.is_internal ? 'bg-amber-500/10 border-amber-500/20' : 'bg-background'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-sm flex items-center gap-2">
                  {msg.senderName}
                  {msg.is_internal && <span className="text-[10px] uppercase bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded-full font-bold">Nota Interna</span>}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      <div className="border p-4 rounded-xl bg-card space-y-4">
        <Textarea 
          placeholder="Escribe un mensaje o respuesta..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <div className="flex justify-between items-center">
          {!isCustomer ? (
            <div className="flex items-center space-x-2">
              <Switch id="internal-mode" checked={isInternal} onCheckedChange={setIsInternal} />
              <Label htmlFor="internal-mode" className="text-sm cursor-pointer">Marcar como Nota Interna (Visible solo para taller)</Label>
            </div>
          ) : <div />}
          
          <Button onClick={handleSubmit} disabled={isLoading || !message.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Enviar Mensaje
          </Button>
        </div>
      </div>
    </div>
  );
}

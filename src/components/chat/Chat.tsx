"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send } from 'lucide-react';
import { useActionState } from 'react';
import { sendChatMessage } from '@/lib/actions';
import type { ChatMessage } from '@/lib/types';
import { getChatMessages } from '@/lib/data';

interface ChatProps {
  motorcycleId: string;
  customerPhone?: string | null;
}

export function Chat({ motorcycleId, customerPhone }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [state, formAction] = useActionState(sendChatMessage, null);

  useEffect(() => {
    async function loadMessages() {
      const loadedMessages = await getChatMessages(motorcycleId);
      setMessages(loadedMessages);
    }
    loadMessages();
  }, [motorcycleId]);

  useEffect(() => {
    if (state?.success) {
      setNewMessage('');
      // Reload messages
      const loadedMessages = await getChatMessages(motorcycleId);
      setMessages(loadedMessages);
    }
  }, [state, motorcycleId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      formAction(new FormData(), new AbortController(), {
        request: {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });
    }
  };

  return (
    <div className="flex flex-col h-64 bg-gray-50 rounded-md border p-4">
      <div className="flex items-center mb-4">
        <MessageCircle className="h-4 w-4 mr-2" />
        <h4 className="font-semibold text-black">Chat con Cliente</h4>
        {customerPhone && <p className="text-sm text-gray-500 ml-auto">{customerPhone}</p>}
      </div>
      <ScrollArea className="flex-1 border rounded-md p-2 mb-2 bg-white">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">No hay mensajes. Inicia la conversación.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2 p-2 rounded-lg ${
                msg.isFromClient
                  ? 'bg-blue-100 ml-8 text-right'
                  : 'bg-green-100 mr-8 text-left'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.sentAt).toLocaleString('es-CO')}
              </p>
            </div>
          ))
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1"
          disabled={!customerPhone}
        />
        <Button type="submit" size="sm" disabled={!newMessage.trim() || !customerPhone}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      {state?.error && <p className="text-red-500 text-sm mt-1">{state.error}</p>}
    </div>
  );
}
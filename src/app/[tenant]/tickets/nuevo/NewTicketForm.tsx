'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitCustomerTicket } from '@/lib/actions/customer-tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Enviando...' : 'Crear Ticket'}
    </Button>
  );
}

export function NewTicketForm({ tenantSlug }: { tenantSlug: string }) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await submitCustomerTicket(null, formData);
      if (result?.errors) {
        // Just show the first error for simplicity
        const firstError = Object.values(result.errors)[0]?.[0];
        if (firstError) setError(firstError);
      } else if (result?.message) {
        setError(result.message);
      }
    } catch (e: any) {
      if (e.message !== 'NEXT_REDIRECT') {
        setError('Ocurrió un error inesperado.');
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle className="text-2xl">Crear Nuevo Ticket de Soporte</CardTitle>
        <CardDescription>
          Ingresa tus datos para abrir una solicitud de soporte con el taller.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          
          {error && (
            <div className="p-3 bg-destructive/15 text-destructive rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customerIdentifier">Identificación (Email o Cédula)</Label>
            <Input 
              id="customerIdentifier" 
              name="customerIdentifier" 
              placeholder="Ej: juan@email.com o 123456789" 
              required 
            />
            <p className="text-xs text-muted-foreground">Usaremos este dato para vincular el ticket a tu historial en el taller.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input 
              id="subject" 
              name="subject" 
              placeholder="Ej: Problema con la reparación, Consulta sobre factura..." 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción detallada</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Explica tu situación con la mayor cantidad de detalles posible..." 
              rows={6}
              required 
            />
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

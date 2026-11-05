'use client';

import { useRef, useState } from 'react';
import { Loader2, MessageCircle, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getTrialWelcomePreview, resendTrialWelcome } from './trial-welcome-actions';
import type { WelcomeDeliveryResult } from '@/lib/trial-welcome-delivery';

const statusLabels: Record<string, string> = {
  sending: 'Envío en proceso', accepted: 'Aceptado por Meta', rejected: 'Rechazado por Meta',
  unconfirmed: 'Sin confirmación', skipped: 'No enviado',
};
const formatDate = (value: string) => new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

export default function TrialWelcomeResend({ workshopId, expired }: { workshopId: string; expired: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getTrialWelcomePreview>> | null>(null);
  const [result, setResult] = useState<WelcomeDeliveryResult | null>(null);
  const requestId = useRef('');
  const sendingRef = useRef(false);

  const openPreview = async () => {
    if (loading || sendingRef.current) return;
    requestId.current = crypto.randomUUID();
    setPreview(null); setResult(null); setOpen(true); setLoading(true);
    try { setPreview(await getTrialWelcomePreview(workshopId)); }
    catch { setPreview({ success: false, error: 'No pudimos consultar la bienvenida. Intenta de nuevo.' }); }
    finally { setLoading(false); }
  };
  const send = async () => {
    if (sendingRef.current || !preview?.success || result) return;
    sendingRef.current = true; setSending(true);
    try { setResult(await resendTrialWelcome(workshopId, requestId.current)); }
    catch { setResult({ success: false, status: 'unconfirmed', message: 'Se perdió la respuesta. Verifica si el mensaje llegó antes de reenviarlo.' }); }
    finally { sendingRef.current = false; setSending(false); }
  };

  return <>
    <Button type="button" variant="outline" size="sm" disabled={expired || loading || sending}
      title={expired ? 'La prueba ya venció' : 'Reenviar la bienvenida de los 15 días gratis'}
      onClick={openPreview} className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300">
      <MessageCircle className="h-4 w-4"/><span className="whitespace-nowrap">Reenviar bienvenida</span>
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!sendingRef.current) setOpen(value); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-500"/>Bienvenida de prueba · 15 días</DialogTitle>
          <DialogDescription>Envía la plantilla de activación al WhatsApp registrado del propietario.</DialogDescription>
        </DialogHeader>
        {loading ? <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>Verificando taller y destinatario...</div>
          : preview?.success ? <div className="space-y-4">
            <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Taller</dt><dd className="break-words font-semibold">{preview.workshopName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">WhatsApp del propietario</dt><dd className="font-mono font-semibold">{preview.phone}</dd></div>
              <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Inicio · Bogotá</dt><dd>{formatDate(preview.startsAt)}</dd></div><div><dt className="text-xs text-muted-foreground">Vencimiento · Bogotá</dt><dd>{formatDate(preview.endsAt)}</dd></div></div>
              {preview.lastStatus && <div className="border-t border-border pt-3"><dt className="text-xs text-muted-foreground">Último intento registrado</dt><dd>{statusLabels[preview.lastStatus] || 'Sin confirmación'}{preview.lastAttemptAt ? ' · ' + formatDate(preview.lastAttemptAt) : ''}</dd></div>}
            </dl>
            <p className="text-xs leading-5 text-muted-foreground">El mensaje incluye la bienvenida, las fechas originales y el enlace de acceso. Conserva la contraseña y la fecha de vencimiento de la prueba.</p>
            {(preview.lastStatus === 'accepted' || preview.lastStatus === 'unconfirmed' || preview.lastStatus === 'sending') && !result &&
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">Ya existe un intento de envío. Confirma con el propietario que necesita otra copia antes de reenviar.</p>}
            {result && <div role="status" aria-live="polite" className={'flex gap-2 rounded-xl border p-3 text-sm ' + (result.success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10')}>
              {result.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"/> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"/>}
              <div><p>{result.message}</p>{result.recorded === false && <p className="mt-2 text-xs">El resultado no pudo guardarse. Comprueba la recepción antes de otro intento.</p>}</div>
            </div>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={sending} onClick={() => setOpen(false)}>{result ? 'Cerrar' : 'Cancelar'}</Button>
              {!result && <Button type="button" disabled={sending} onClick={send} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                {sending ? 'Enviando bienvenida...' : 'Reenviar bienvenida de prueba'}
              </Button>}
            </div>
          </div> : preview && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{preview.error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}

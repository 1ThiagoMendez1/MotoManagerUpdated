'use client';

import { useEffect, useState } from 'react';
import { QrCode, Download, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setCustomerEnrollment } from '@/lib/actions/profile';
import { workshopPath } from '@/lib/workshops/enrollment';
import { workshopPoster } from '@/lib/workshops/poster';
import Image from 'next/image';

export default function WorkshopQR({ name, slug, enabled: initialEnabled }: { name: string; slug: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [qr, setQR] = useState('');
  const [url, setURL] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const target = new URL(workshopPath(slug), window.location.origin).toString();
    setURL(target);
    import('qrcode').then(module => module.toString(target, { type: 'svg', errorCorrectionLevel: 'Q', margin: 4, width: 512 }))
      .then(svg => { if (active) setQR(svg); })
      .catch(() => { if (active) setError('No se pudo generar el QR. Recarga e intenta de nuevo.'); });
    return () => { active = false; };
  }, [slug]);

  async function toggle() {
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await setCustomerEnrollment(!enabled);
      if (result.error) setError(result.error);
      else { setEnabled(!enabled); setMessage(enabled ? 'Inscripciones desactivadas. El QR impreso deja de aceptar registros.' : '¡Tu taller ya puede recibir registros!'); }
    } catch { setError('No se pudo guardar. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  function download(poster: boolean) {
    const blob = new Blob([poster ? workshopPoster(name, url, qr) : qr], { type: 'image/svg+xml;charset=utf-8' });
    const objectURL = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = objectURL;
    anchor.download = `${poster ? 'cartel' : 'qr'}-${slug}.svg`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
  }
  return <section className="mt-8 overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
    <div className="border-b bg-primary/5 p-6"><div className="flex items-center gap-3"><QrCode className="h-6 w-6 text-primary" /><h2 className="text-lg font-semibold">Tu vitrina conecta</h2></div><p className="mt-2 text-sm text-muted-foreground">Convierte una visita en una relación. Tus clientes escanean, verifican su correo y quedan registrados en tu taller.</p></div>
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Inscripciones {enabled ? 'activas' : 'desactivadas'}</p><p className="text-xs text-muted-foreground">Puedes desactivarlas sin reimprimir el QR.</p></div><Button type="button" variant={enabled ? 'outline' : 'default'} disabled={busy} onClick={toggle}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{enabled ? 'Desactivar' : 'Activar registro'}</Button></div>
      <div className="flex flex-col items-center gap-5 rounded-xl bg-muted/30 p-5 sm:flex-row">
        {qr ? <Image unoptimized src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} width={176} height={176} alt={`Código QR para registrarse en ${name}`} className="rounded-lg bg-white" /> : <div className="flex h-44 w-44 items-center justify-center"><Loader2 className="animate-spin" /></div>}
        <div className="space-y-3"><h3 className="font-semibold">Tu moto tiene un lugar.</h3><p className="text-sm text-muted-foreground">Descarga el cartel vectorial en proporción A4. Imprime sin recortar el borde blanco y prueba el escaneo desde varios teléfonos antes de colocarlo.</p><p className="break-all text-xs text-muted-foreground">{url}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!qr || !enabled} onClick={() => download(true)}><Download className="mr-2 h-4 w-4" />Cartel para vitrina</Button>
        <Button type="button" variant="outline" disabled={!qr || !enabled} onClick={() => download(false)}>Solo QR (SVG)</Button>
        <Button type="button" variant="outline" disabled={!url} onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Enlace copiado.'); } catch { setError('Copia el enlace que aparece arriba.'); } }}><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button>
        {enabled && <Button type="button" variant="ghost" asChild><a href={workshopPath(slug)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ver página</a></Button>}
      </div>
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">El QR contiene únicamente la dirección pública del taller. No expone datos de clientes ni credenciales.</p>
    </div>
  </section>;
}

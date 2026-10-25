'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveWorkshopImage } from '@/lib/actions/workshop-image';
import { MAX_WORKSHOP_IMAGE_SIZE } from '@/lib/workshops/public-image';
import { WorkshopImage } from './WorkshopImage';

export function WorkshopImageUploader({ initialUrl, name }: { initialUrl?: string | null; name: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  async function save(file?: File, remove = false) {
    if (busy || (!file && !remove)) return;
    if (file && file.size > MAX_WORKSHOP_IMAGE_SIZE) { setMessage('La imagen debe pesar como máximo 2 MB.'); return; }
    setBusy(true); setMessage('');
    try {
      const form = new FormData();
      if (remove) form.set('remove', 'true');
      else if (file) form.set('image', file);
      const result = await saveWorkshopImage(form);
      setMessage(result.message);
      if (result.success) setUrl(result.url || null);
    } catch { setMessage('No se pudo guardar la imagen. Intenta de nuevo.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
    <WorkshopImage src={url} name={name} className="h-32 w-full shrink-0 rounded-xl border sm:w-48" />
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Esta imagen se muestra públicamente en la landing, el directorio y el QR de tu taller.</p>
      <p className="text-xs text-muted-foreground">JPG, PNG o WebP · Máximo 2 MB · Usa el logo o una foto de tu taller.</p>
      <input ref={input} type="file" className="sr-only" aria-label="Seleccionar imagen pública del taller"
        accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void save(event.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {busy ? 'Guardando...' : url ? 'Cambiar imagen del taller' : 'Subir imagen del taller'}
        </Button>
        {url && <Button type="button" variant="ghost" disabled={busy} onClick={() => void save(undefined, true)}><Trash2 className="mr-2 h-4 w-4" />Quitar imagen</Button>}
      </div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  </div>;
}

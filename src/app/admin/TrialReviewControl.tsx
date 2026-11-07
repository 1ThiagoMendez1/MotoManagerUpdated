'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PauseCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TRIAL_REVIEW_MESSAGE, type AdminTrialReview } from '@/lib/trial-review';
import { pauseWorkshopTrial, verifyWorkshopTrial } from './trial-review-actions';

type Workshop = {
  id: string; name: string; phone: string; city: string; address: string;
  trial_review?: AdminTrialReview | null;
  members?: { role: string; profile: { name: string; phone: string } }[];
};

export default function TrialReviewControl({ workshop }: { workshop: Workshop }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const review = workshop.trial_review;
  const paused = review?.status === 'paused';
  const owner = workshop.members?.find(member => member.role === 'owner')?.profile;
  const verified = review?.verification;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) || '');
    setPending(true);
    setError('');
    try {
      const result = paused
        ? await verifyWorkshopTrial({ workshopId: workshop.id, reason: text('reason'), verification: {
            workshopName: text('workshopName'), city: text('city'), address: text('address'),
            responsibleName: text('responsibleName'), phone: text('phone'), evidence: text('evidence'),
            contacted: data.get('contacted') === 'on', locationChecked: data.get('locationChecked') === 'on', evidenceChecked: data.get('evidenceChecked') === 'on',
          } })
        : await pauseWorkshopTrial({ workshopId: workshop.id, reason: text('reason'), message: text('message') });
      if (!result.success) { setError(result.error || 'No se pudo guardar.'); return; }
      setOpen(false);
      toast({ title: paused ? 'Taller verificado y prueba reactivada' : 'Prueba pausada para revisión', description: paused ? 'El taller recuperó el acceso y el tiempo pendiente de prueba.' : 'El equipo del taller verá el aviso de verificación.' });
      router.refresh();
    } catch {
      setError('No se pudo guardar la revisión. Intenta de nuevo.');
    } finally { setPending(false); }
  }

  return <>
    <Button size="sm" variant="outline" onClick={() => { setError(''); setOpen(true); }} className={paused ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : ''}>
      {paused ? <ShieldCheck className="mr-1.5 h-4 w-4" /> : <PauseCircle className="mr-1.5 h-4 w-4" />}
      {paused ? 'Revisar y reactivar' : 'Pausar prueba'}
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{paused ? 'Verificar taller y reactivar prueba' : 'Pausar prueba gratuita'}</DialogTitle>
          <DialogDescription>{workshop.name} · {paused ? 'Confirma los datos reales antes de devolver el acceso.' : 'Se bloqueará el acceso de los miembros del taller y se conservarán los días pendientes.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {paused ? <>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm">
              <p className="font-semibold">Motivo interno de la pausa</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{review.reason}</p>
              <p className="mt-2">Tiempo conservado: {Math.ceil(review.remainingSeconds / 86400)} días de prueba.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor={'review-name-' + workshop.id}>Nombre real del taller</Label><Input id={'review-name-' + workshop.id} name="workshopName" defaultValue={workshop.name} required minLength={3} maxLength={120} /></div>
              <div className="space-y-1.5"><Label htmlFor={'review-city-' + workshop.id}>Ciudad</Label><Input id={'review-city-' + workshop.id} name="city" defaultValue={workshop.city} required minLength={2} maxLength={120} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={'review-address-' + workshop.id}>Dirección comprobada</Label><Input id={'review-address-' + workshop.id} name="address" defaultValue={workshop.address} required minLength={5} maxLength={300} /></div>
              <div className="space-y-1.5"><Label htmlFor={'review-owner-' + workshop.id}>Responsable del taller</Label><Input id={'review-owner-' + workshop.id} name="responsibleName" defaultValue={verified?.responsibleName || owner?.name || ''} required minLength={3} maxLength={120} /></div>
              <div className="space-y-1.5"><Label htmlFor={'review-phone-' + workshop.id}>Celular confirmado</Label><Input id={'review-phone-' + workshop.id} name="phone" type="tel" defaultValue={workshop.phone || owner?.phone || ''} required maxLength={30} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor={'review-evidence-' + workshop.id}>Evidencia comprobada</Label><Textarea id={'review-evidence-' + workshop.id} name="evidence" required minLength={10} maxLength={1000} placeholder="Ej.: ubicación contrastada, foto de la fachada o videollamada mostrando el taller. Registra la referencia de lo que verificaste." /></div>
            <fieldset className="space-y-3 rounded-xl border p-4 text-sm">
              <legend className="px-1 font-semibold">Comprobaciones realizadas</legend>
              <label className="flex items-start gap-2"><input type="checkbox" name="contacted" required className="mt-1 accent-blue-600" />Hablé directamente con el responsable y confirmé su celular.</label>
              <label className="flex items-start gap-2"><input type="checkbox" name="locationChecked" required className="mt-1 accent-blue-600" />Comprobé el nombre, la ciudad y la dirección del taller.</label>
              <label className="flex items-start gap-2"><input type="checkbox" name="evidenceChecked" required className="mt-1 accent-blue-600" />Revisé evidencia de que funciona como taller de motos.</label>
            </fieldset>
            <p className="text-xs text-muted-foreground">Al aprobar, se actualizarán el nombre, celular, ciudad y dirección del taller con estos datos confirmados.</p>
          </> : <>
            <div className="space-y-1.5"><Label htmlFor={'review-message-' + workshop.id}>Mensaje que verá el usuario</Label><Textarea id={'review-message-' + workshop.id} name="message" defaultValue={TRIAL_REVIEW_MESSAGE} rows={5} required minLength={30} maxLength={1000} /></div>
          </>}
          <div className="space-y-1.5">
            <Label htmlFor={'review-reason-' + workshop.id}>{paused ? 'Conclusión de la verificación (solo administración)' : 'Motivo de la pausa (solo administración)'}</Label>
            <Textarea id={'review-reason-' + workshop.id} name="reason" required minLength={8} maxLength={1000} placeholder={paused ? 'Datos corregidos y comprobaciones realizadas.' : 'Describe la inconsistencia o el motivo que necesitas validar.'} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{paused ? 'Confirmar verificación y reactivar' : 'Pausar prueba y bloquear acceso'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

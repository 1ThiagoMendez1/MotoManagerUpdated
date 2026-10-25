'use client';

import { useState } from 'react';
import { Star, Send, Share2, CheckCircle2 } from 'lucide-react';
import { submitCustomerServiceReview } from '@/app/clientes/reputation-actions';

type Review = { rating: number; recommended: boolean; comment: string; publishComment: boolean } | null;

export function DeliveredServiceReview({
  orderId, orderNumber, workshopName, workshopSlug, existing,
}: {
  orderId: string; orderNumber: string; workshopName: string; workshopSlug?: string; existing: Review;
}) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [recommended, setRecommended] = useState<boolean | null>(existing?.recommended ?? null);
  const [comment, setComment] = useState(existing?.comment || '');
  const [publishComment, setPublishComment] = useState(existing?.publishComment || false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(Boolean(existing));

  async function save() {
    if (!rating || recommended === null) { setMessage('Selecciona de 1 a 5 estrellas y responde si recomendarías el taller.'); return; }
    setSaving(true); setMessage('');
    try {
      const result = await submitCustomerServiceReview({
        workOrderId: orderId, rating, recommended, comment, publishComment: publishComment && !!comment.trim(),
      });
      setMessage(result.message);
      if (result.success) setSaved(true);
    } catch { setMessage('No se pudo guardar tu opinión. Intenta nuevamente.'); }
    finally { setSaving(false); }
  }
  const shareUrl = workshopSlug ? 'https://motomanager.com.co/talleres/' + encodeURIComponent(workshopSlug) : null;
  return (
    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
        {saved ? <CheckCircle2 className="h-4 w-4" /> : <Star className="h-4 w-4" />}
        {saved ? 'Tu opinión verificada' : '¿Cómo te fue con tu moto?'}
      </div>
      <p className="mt-1 text-xs text-slate-400">Orden #{orderNumber} · Solo clientes con servicios entregados pueden valorar. Tu foto y datos personales no se publican.</p>
      <div className="mt-3 flex items-center gap-1" role="group" aria-label="Calificación de uno a cinco">
        {[1,2,3,4,5].map(value => (
          <button type="button" key={value} onClick={() => setRating(value)}
            className="rounded-md p-1 hover:bg-amber-500/10"
            aria-label={value + ' estrellas'} aria-pressed={rating === value}>
            <Star className={'h-6 w-6 ' + (value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-500')} />
          </button>
        ))}
        <span className="ml-2 text-xs text-slate-300">{rating ? rating + '/5' : 'Elige estrellas'}</span>
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-slate-200">¿Recomendarías {workshopName}?</legend>
        <div className="mt-2 flex gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2"><input type="radio" name={'recommend-' + orderId}
            checked={recommended === true} onChange={() => setRecommended(true)} /> Sí</label>
          <label className="flex items-center gap-2"><input type="radio" name={'recommend-' + orderId}
            checked={recommended === false} onChange={() => setRecommended(false)} /> No</label>
        </div>
      </fieldset>
      <label className="mt-3 block text-xs font-semibold text-slate-200" htmlFor={'review-' + orderId}>Tu experiencia (opcional)</label>
      <textarea id={'review-' + orderId} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white"
        placeholder="¿Cómo fue la atención, la reparación y la entrega?" rows={3}
        maxLength={700} value={comment} onChange={e => setComment(e.target.value)} />
      <label className="mt-2 flex items-start gap-2 text-xs text-slate-300">
        <input type="checkbox" checked={publishComment} disabled={!comment.trim()}
          onChange={e => setPublishComment(e.target.checked)} />
        Autorizo mostrar mi comentario públicamente sin mi nombre ni fotografía. El promedio de estrellas se muestra de forma agregada.
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
          <Send className="h-4 w-4" /> {saving ? 'Guardando...' : saved ? 'Actualizar opinión' : 'Enviar valoración'}
        </button>
        {saved && shareUrl && <a target="_blank" rel="noopener noreferrer"
          href={'https://wa.me/?text=' + encodeURIComponent('Te comparto este taller de motos: ' + workshopName + ' ' + shareUrl)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200">
          <Share2 className="h-4 w-4" /> Recomendar a un amigo
        </a>}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-slate-200">{message}</p>}
    </div>
  );
}

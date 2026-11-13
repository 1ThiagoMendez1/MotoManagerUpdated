'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { phoneRequestSchema } from '@/lib/workshop-phone-shared';
import { emitTrialDiagnostic } from '@/lib/analytics/trial-events';

type Field = 'workshop' | 'phone' | 'code';
export function PhoneAccessForm({ mode }: { mode: 'signup' | 'login' }) {
  const signup = mode === 'signup', form = useRef<HTMLFormElement>(null), busy = useRef(false);
  const viewed = useRef(new Set<Field>()), edited = useRef<Field | null>(null);
  const [data, setData] = useState({ workshopName: '', phone: '', code: '', marketing: false });
  const [challenge, setChallenge] = useState(''), [delivery, setDelivery] = useState('');
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [errorCode, setErrorCode] = useState('');
  const [retryAt, setRetryAt] = useState(0), [seconds, setSeconds] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const measure = (field: Field, stage: 'view' | 'edit' | 'valid' | 'invalid') => {
    if (!signup) return;
    if (stage === 'view') { if (viewed.current.has(field)) return; viewed.current.add(field); }
    if (stage === 'edit') { if (edited.current === field) return; edited.current = field; }
    emitTrialDiagnostic({ kind: 'form_step', target: `field_v2:${field}:${stage}` });
  };
  const milestone = (target: 'request' | 'accepted' | 'verify' | 'verified') => {
    if (signup) emitTrialDiagnostic({ kind: 'form_step', target: `phone_v1:${target}` });
  };
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= .55) { measure(entry.target.getAttribute('data-phone-field') as Field, 'view'); observer.unobserve(entry.target); }
    }), { threshold: .55 });
    form.current?.querySelectorAll('[data-phone-field]').forEach(field => observer.observe(field));
    return () => observer.disconnect();
  }, [hydrated, challenge]);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval);
  }, [retryAt]);
  useEffect(() => {
    if (!challenge) return;
    let cancelled = false, count = 0;
    const interval = setInterval(async () => {
      if (++count > 6) { clearInterval(interval); return; }
      try { const response = await fetch('/api/workshop-auth/phone?challenge=' + challenge, { cache: 'no-store' });
        const result = await response.json(); if (!cancelled && response.ok && result.status) setDelivery(result.status);
      } catch { /* Delivery confirmation is optional; code verification still works. */ }
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [challenge]);

  async function submit(event?: React.FormEvent, resend = false) {
    event?.preventDefault(); if (busy.current) return;
    const values = form.current ? new FormData(form.current) : null;
    const current = { ...data, workshopName: String(values?.get('workshopName') ?? data.workshopName),
      phone: String(values?.get('phone') ?? data.phone), code: String(values?.get('code') ?? data.code) };
    setData(current); setError(''); setErrorCode('');
    const verifying = !!challenge && !resend;
    if (!verifying) {
      // Build the exact allowlisted payload; the access code is never part of a request.
      const input = phoneRequestSchema.safeParse({ action: 'request', mode, phone: current.phone, workshopName: current.workshopName,
        marketing: current.marketing, terms: true, website: String(values?.get('website') || '') });
      if (!input.success) {
        setError(input.error.issues[0]?.message || 'Revisa los datos.');
        if (signup) emitTrialDiagnostic({ kind: 'form_error', target: 'validation' });
        measure(input.error.issues[0]?.path[0] === 'workshopName' ? 'workshop' : 'phone', 'invalid'); return;
      }
      measure('phone', 'valid'); if (signup) measure('workshop', 'valid'); milestone('request');
    } else {
      if (!/^\d{6}$/.test(current.code)) { setError('Escribe los seis dígitos del mensaje.'); measure('code', 'invalid'); return; }
      measure('code', 'valid'); milestone('verify');
      if (signup) emitTrialDiagnostic({ kind: 'form_submit', target: 'activate' });
    }
    busy.current = true; setPending(true);
    try {
      const response = await fetch('/api/workshop-auth/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifying ? { action: 'verify', challenge, code: current.code } :
          { action: 'request', mode, phone: current.phone, workshopName: current.workshopName, marketing: current.marketing, terms: true, website: String(values?.get('website') || '') }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'No pudimos completar el acceso.'); setErrorCode(result.code || 'unavailable');
        if (result.code === 'invalid' || result.code === 'expired') measure('code', 'invalid');
        if (result.code === 'limited') setRetryAt(Date.now() + 60000); return; }
      if (result.redirect) { if (verifying) milestone('verified'); window.location.assign(result.redirect); return; }
      if (result.challenge) {
        setChallenge(result.challenge); setDelivery(result.delivery); setData({ ...current, code: '' });
        setRetryAt(Date.now() + (result.retryAfter || 60) * 1000); if (result.delivery === 'accepted') milestone('accepted');
        requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('#phone-code')?.focus());
      }
    } catch { setError('No recibimos respuesta. Revisa tu conexión y vuelve a continuar.'); }
    finally { busy.current = false; setPending(false); }
  }
  const inputClass = 'mt-2 h-12 w-full rounded-xl border border-white/20 bg-[#071221] px-3.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20';
  return <section className="min-w-0 rounded-2xl border border-white/15 bg-[#0d1b2e] p-5 text-white shadow-xl sm:p-7" aria-label={signup ? 'Crear tu taller con WhatsApp' : 'Ingresar con WhatsApp'}>
    <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-200"><ShieldCheck size={16}/>{challenge ? 'Paso 2 de 2 · Verifica tu número' : 'Sin correo ni contraseña'}</p>
    <h2 className="text-xl font-bold sm:text-2xl">{challenge ? 'Revisa tu WhatsApp' : signup ? 'Crea tu taller gratis' : 'Entra con tu WhatsApp'}</h2>
    <p className="mb-5 mt-2 text-sm leading-6 text-slate-300">{challenge ? `Escribe el código que solicitaste al número terminado en ${data.phone.replace(/\D/g, '').slice(-4)}. Dura 5 minutos.` : signup ? 'Pon el nombre de tu taller y recibe un código para activar tus 15 días de Full.' : 'Usa el número con el que creaste tu taller por WhatsApp. Te enviaremos un código de acceso.'}</p>
    <form ref={form} onSubmit={submit} noValidate data-trial-form={signup ? 'v3-phone' : undefined} className="space-y-4">
      {!challenge ? <>
        {signup && <div data-phone-field="workshop"><label htmlFor="phone-workshop" className="text-sm font-semibold">Nombre del taller</label>
          <input id="phone-workshop" name="workshopName" autoComplete="organization" placeholder="Ej. Motos Passion" maxLength={120} required defaultValue={data.workshopName} onChange={() => measure('workshop', 'edit')} className={inputClass}/></div>}
        <div data-phone-field="phone"><label htmlFor="phone-number" className="text-sm font-semibold">Tu número de WhatsApp</label>
          <input id="phone-number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" maxLength={30} required defaultValue={data.phone} onChange={() => measure('phone', 'edit')} aria-describedby="phone-purpose phone-format" className={inputClass}/>
          <p id="phone-format" className="mt-1.5 text-xs leading-5 text-slate-400">Colombia: 10 dígitos. Otro país: incluye el indicativo.</p>
        </div>
        <div id="phone-purpose" className="flex items-start gap-2.5 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs leading-5 text-slate-300"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300"/><p>El código sirve para verificar tu número y entrar a tu cuenta. Este registro no conecta tu WhatsApp ni permite leer tus chats. Las promociones son opcionales.</p></div>
        {signup && <details className="text-xs leading-5 text-slate-300"><summary className="cursor-pointer">Consejos y promociones · opcional</summary><label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={data.marketing} onChange={e => setData(current => ({ ...current, marketing: e.target.checked }))} className="mt-1 accent-orange-400"/><span>Quiero consejos y promociones de MotoManager por WhatsApp. Puedo pedir dejar de recibirlos. La prueba se activa igual sin marcarlo.</span></label></details>}
        <div className="hidden" aria-hidden="true"><label>Sitio web<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
        <p className="text-[11px] leading-5 text-slate-400">Al continuar, solicitas tu código y autorizas el tratamiento de datos para gestionar tu cuenta.{signup && ' Prueba Full de 15 días por taller y celular, sin tarjeta ni cobros automáticos.'} <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-orange-200 underline">Política de privacidad</Link></p>
      </> : <>
        <div data-phone-field="code"><label htmlFor="phone-code" className="text-sm font-semibold">Código de 6 dígitos</label>
          <input id="phone-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" required value={data.code} aria-describedby="phone-code-help"
            onChange={event => { const code = event.target.value.replace(/\D/g, '').slice(0, 6); setData(current => ({ ...current, code })); measure('code', 'edit'); if (code.length === 6) queueMicrotask(() => form.current?.requestSubmit()); }}
            className={inputClass + ' text-center text-2xl font-bold tracking-[.4em]'}/>
          <p id="phone-code-help" className="mt-2 text-xs leading-5 text-slate-400">Usa el código del último mensaje. Nunca te pediremos el PIN de tu WhatsApp.</p>
        </div>
        <p role="status" className="text-xs leading-5 text-slate-300">{delivery === 'delivered' ? 'WhatsApp confirmó la entrega del mensaje.' : delivery === 'failed' ? 'WhatsApp informó un problema de entrega. Revisa el número y solicita otro código.' : delivery === 'unknown' ? 'No pudimos confirmar el envío. Si el código llegó, puedes usarlo.' : 'La solicitud fue aceptada por WhatsApp. Si no llega, podrás pedir otro código.'}</p>
      </>}
      {error && <div role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100">{error}{errorCode === 'legacy' && <Link href="/login?method=email" className="mt-2 block font-bold underline">Entrar con correo y contraseña</Link>}{errorCode === 'no_account' && <Link href="/prueba-gratis" className="mt-2 block font-bold underline">Crear mi prueba gratis</Link>}</div>}
      <button type="submit" disabled={!hydrated || pending} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 font-extrabold text-[#081121] hover:bg-[#ffa149] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:opacity-60">{pending ? <Loader2 size={20} className="animate-spin"/> : challenge ? <Check size={20}/> : <MessageCircle size={20}/>} {pending ? challenge ? 'Abriendo tu taller…' : 'Solicitando tu código…' : challenge ? signup ? 'Verificar y entrar a mi taller' : 'Verificar e ingresar' : 'Recibir código por WhatsApp'}{!pending && <ArrowRight size={18}/>}</button>
      {challenge && <div className="flex flex-wrap justify-between gap-2 text-xs">
        <button type="button" disabled={pending} onClick={() => { setChallenge(''); setError(''); }} className="inline-flex min-h-11 items-center gap-1 text-slate-300 disabled:opacity-50"><ArrowLeft size={14}/>Corregir mi número</button>
        <button type="button" disabled={pending || seconds > 0} onClick={() => void submit(undefined, true)} className="min-h-11 font-semibold text-orange-200 disabled:text-slate-500">{seconds > 0 ? `Reenviar en ${seconds} s` : 'Pedir otro código'}</button>
      </div>}
    </form>
    {!challenge && signup && <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-slate-300">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-orange-200 underline">Inicia sesión</Link></p>}
    {!signup && <p className="mt-4 text-xs leading-5 text-slate-400">Si tu sesión sigue activa, entrarás sin pedir otro código.</p>}
  </section>;
}

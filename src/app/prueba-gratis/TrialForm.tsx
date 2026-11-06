'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Gift, LockKeyhole,
  MessageCircle, ShieldCheck, Sparkles, X, Loader2,
} from 'lucide-react';
import { startFullTrial } from './actions';

type FieldName = 'workshopName' | 'city' | 'fullName' | 'phone' | 'email' | 'password';
const fieldGroups: { name: FieldName; label: string; placeholder: string; type?: string; autoComplete: string; minLength?: number; maxLength: number }[][] = [
  [
    { name: 'workshopName', label: '¿Cómo se llama tu taller?', placeholder: 'Ej. Taller Moto Rayo', autoComplete: 'organization', minLength: 3, maxLength: 120 },
    { name: 'city', label: '¿En qué ciudad trabajas?', placeholder: 'Ej. Bogotá', autoComplete: 'address-level2', minLength: 2, maxLength: 120 },
  ],
  [
    { name: 'fullName', label: '¿Cómo te llamas?', placeholder: 'Tu nombre y apellido', autoComplete: 'name', minLength: 2, maxLength: 120 },
    { name: 'phone', label: 'Tu WhatsApp', placeholder: '300 123 4567', type: 'tel', autoComplete: 'tel', minLength: 10, maxLength: 25 },
    { name: 'email', label: 'Tu correo electrónico', placeholder: 'tu@correo.com', type: 'email', autoComplete: 'email', maxLength: 254 },
  ],
  [
    { name: 'password', label: 'Crea tu contraseña', placeholder: 'Mínimo 10 caracteres', type: 'password', autoComplete: 'new-password', minLength: 10, maxLength: 128 },
  ],
];

const initialData: Record<FieldName, string> = {
  workshopName: '', city: '', fullName: '', phone: '', email: '', password: '',
};

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" name="welcomeRequested" value="yes" disabled={pending}
    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 text-sm font-extrabold text-[#081121] shadow-lg shadow-orange-500/10 transition hover:bg-[#ffa149] disabled:opacity-60">
    {pending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Gift className="h-5 w-5"/>}
    {pending ? 'Estamos activando tu taller...' : 'Activar mis 15 días y recibir mi bienvenida'}
    {!pending && <ArrowRight className="h-5 w-5" />}
  </button>;
}

export function TrialForm() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(startFullTrial, { error: '' });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const input = formRef.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])');
      input?.focus({ preventScroll: true });
    }
  }, [step, open]);

  function next() {
    if (!formRef.current?.reportValidity()) return;
    setStep(s => Math.min(s + 1, 2));
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setStep(0); }}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff831b] px-5 text-base font-black text-[#071222] shadow-xl shadow-orange-500/15 transition hover:bg-[#ffad68] sm:w-auto">
      <Gift className="h-5 w-5" /> Activar mis 15 días gratis <ArrowRight className="h-5 w-5"/>
    </button>
    {!open ? <p className="mt-4 text-xs text-slate-400">Sin tarjeta ni cobros automáticos. Puedes abrir el registro cuando quieras.</p> : null}

    {open && <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="trial-wizard-heading">
      <button type="button" className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setOpen(false)} aria-label="Cerrar registro" />
      <section className="relative flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-[#0d1b2e] text-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,760px)] sm:rounded-[28px] sm:border sm:border-white/15">
        <header className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-black tracking-tight"><Image src="/logo.png" width={33} height={33} alt="" />MotoManager</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10"><X className="h-5 w-5"/></button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#ffb47d]">15 días Full, $0</span>
            <span className="text-xs font-semibold text-slate-300">Paso {step + 1} de 3</span>
          </div>
          <div className="mt-3 flex gap-1.5" aria-label={'Progreso: paso '+(step+1)+' de 3'}>
            {[0, 1, 2].map(i => <span key={i} className={'h-1.5 flex-1 rounded-full transition '+(i<=step?'bg-[#ff831b]':'bg-white/15')} />)}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5"/> Sin tarjeta. Sin cobros automáticos.
          </span>
          <h2 id="trial-wizard-heading" className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {step === 0 ? 'Primero, cuéntanos de tu taller.' : step === 1 ? '¿Quién estará al frente?' : '¡Casi listo! Abre tu taller.'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {step === 0 ? 'Son solo dos datos. Queremos configurar tu espacio para trabajar desde hoy.'
              : step === 1 ? 'Estos datos te servirán para entrar y recibir los detalles de tu prueba.'
              : 'Crea una contraseña segura y empieza a trabajar con MotoManager Full.'}
          </p>

          <form ref={formRef} id="trial-wizard-form" action={action} className="mt-6 space-y-4">
            {fieldGroups[step].map(field =>
              <label key={field.name} className="block text-sm font-semibold text-slate-100">
                {field.label}
                <span className="relative mt-2 block">
                  <input name={field.name} type={field.type === 'password' && showPassword ? 'text' : field.type || 'text'}
                    autoComplete={field.autoComplete} placeholder={field.placeholder} value={data[field.name]}
                    required minLength={field.minLength} maxLength={field.maxLength} onChange={event => setData(v => ({ ...v, [field.name]: event.target.value }))}
                    inputMode={field.name === 'phone' ? 'tel' : undefined}
                    className={'h-14 w-full rounded-xl border border-white/20 bg-[#071221] px-4 text-base font-medium text-white outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 '+(field.name==='password'?'pr-12':'')} />
                  {field.name === 'password' && <button type="button" onClick={() => setShowPassword(v=>!v)}
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-slate-400 hover:text-white"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button>}
                </span>
              </label>
            )}
            {Object.entries(data).filter(([name]) => !fieldGroups[step].some(f => f.name === name)).map(([name,value]) =>
              <input key={name} type="hidden" name={name} value={value} />
            )}
            <input type="hidden" name="termsAcknowledged" value="yes" />
            <div className="hidden" aria-hidden="true"><label htmlFor="trial-website">Sitio web</label><input id="trial-website" name="website" tabIndex={-1} autoComplete="off" /></div>

            {step === 2 && <div className="space-y-3">
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-emerald-200"><MessageCircle size={17}/> Bienvenida a tu WhatsApp</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">Al elegir el botón naranja, solicitas a MotoManager que te envíe <strong>un único mensaje de activación</strong> con las fechas de tu prueba y el enlace de acceso. No autorizas publicidad.</p>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">
                Al activar, aceptas las condiciones de la prueba: 15 días por taller, correo y celular, sin cobros automáticos. Autorizas el tratamiento de tus datos para crear y gestionar tu cuenta. Puedes solicitar su actualización o eliminación a MotoManager.
              </p>
            </div>}

            {state.error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p>}
            <div className="pt-2">
              {step < 2
                ? <button type="button" onClick={next} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 text-base font-black text-[#081121] hover:bg-[#ffa149]">Continuar <ArrowRight className="h-5 w-5"/></button>
                : <Submit/>}
              {step > 0 && <button type="button" onClick={() => setStep(s => Math.max(s - 1,0))}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5"><ArrowLeft className="h-4 w-4"/> Volver</button>}
            </div>
          </form>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><LockKeyhole size={13}/> Tus datos se usan para activar el taller, no para venderlos.</p>
        </div>
        <footer className="shrink-0 border-t border-white/10 px-5 py-3 text-center text-xs text-slate-400">
          ¿Ya tienes cuenta? <Link href="/login" className="font-bold text-[#ffb780] underline underline-offset-4">Inicia sesión</Link>
        </footer>
      </section>
    </div>}
  </>;
}

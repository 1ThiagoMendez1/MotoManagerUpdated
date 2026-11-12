'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Gift, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { startFullTrial } from './actions';
import { TRIAL_FIELDS, TRIAL_STEPS, trialFailure, validateTrialStep, type TrialField, type TrialFormState } from '@/lib/trial-signup';
import { emitTrialDiagnostic } from '@/lib/analytics/trial-events';
import { trialFieldTarget, type TrialFieldStage } from '@/lib/analytics/trial-fields';

const fields: Record<TrialField, { label: string; placeholder: string; type: string; autoComplete: string; maxLength: number }> = {
  workshopName: { label: 'Nombre del taller', placeholder: 'Ej. Moto Taller Rayo', type: 'text', autoComplete: 'organization', maxLength: 120 },
  fullName: { label: 'Tu nombre', placeholder: 'Nombre y apellido', type: 'text', autoComplete: 'name', maxLength: 120 },
  phone: { label: 'WhatsApp del responsable', placeholder: '300 123 4567', type: 'tel', autoComplete: 'tel', maxLength: 25 },
  email: { label: 'Correo para iniciar sesión', placeholder: 'tu@correo.com', type: 'email', autoComplete: 'email', maxLength: 254 },
  password: { label: 'Crea tu contraseña', placeholder: 'Mínimo 10 caracteres', type: 'password', autoComplete: 'new-password', maxLength: 128 },
};
const initialData: Record<TrialField, string> = { workshopName: '', fullName: '', phone: '', email: '', password: '' };

function trialFormValues(form: HTMLFormElement | null, previous: Record<TrialField, string>) {
  if (!form) return previous;
  const submitted = new FormData(form);
  return Object.fromEntries(TRIAL_FIELDS.map(field => [field, String(submitted.get(field) ?? previous[field])])) as Record<TrialField, string>;
}


function FormControls({ step, back, interactive }: { step: number; back: () => void; interactive: boolean }) {
  const { pending } = useFormStatus();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 18000);
    return () => clearTimeout(timer);
  }, [pending]);
  return <div className="space-y-3 pt-2">
    <button type="submit" disabled={pending || !interactive} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 text-base font-extrabold text-[#081121] shadow-lg shadow-orange-500/10 transition hover:bg-[#ffa149] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-70">
      {pending ? <Loader2 className="h-5 w-5 animate-spin"/> : step === 1 ? <Gift className="h-5 w-5"/> : null}
      {pending ? 'Creando tu taller…' : !interactive ? 'Preparando el registro…' : step === 0 ? 'Continuar con mi acceso' : 'Crear mi taller gratis'}
      {!pending && <ArrowRight className="h-5 w-5 shrink-0"/>}
    </button>
    {pending && <p role="status" className="text-center text-xs leading-5 text-slate-300">{slow ? <>Está tomando más tiempo de lo esperado. Evita enviar otra solicitud. Si ya se creó tu cuenta, <Link href="/login" className="text-orange-200 underline">puedes iniciar sesión aquí</Link>.</> : 'Estamos preparando tu espacio. Entrarás directamente al taller.'}</p>}
    {step === 1 && <button type="button" disabled={pending} onClick={back} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"><ArrowLeft size={15}/> Corregir datos del taller</button>}
  </div>;
}

export function TrialForm() {
  const [interactive, setInteractive] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Partial<Record<TrialField, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [marketingRequested, setMarketingRequested] = useState(false);
  const [submittedError, setSubmittedError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const viewedFields = useRef(new Set<TrialField>());
  const lastEditedField = useRef<TrialField | null>(null);
  const fieldResults = useRef(new Map<TrialField, 'valid' | 'invalid'>());
  const [state, action] = useActionState(async (previous: TrialFormState, form: FormData) => {
    try { return await startFullTrial(previous, form); }
    catch (error) {
      // Next uses this control-flow exception for a successful server redirect.
      if (typeof error === 'object' && error && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) throw error;
      return trialFailure('connection');
    }
  }, { error: '' } as TrialFormState);

  const readCurrentForm = (form: HTMLFormElement | null) => trialFormValues(form, data);
  function measureField(name: TrialField, stage: TrialFieldStage) {
    if (stage === 'view') {
      if (viewedFields.current.has(name)) return;
      viewedFields.current.add(name);
    } else if (stage === 'edit') {
      // Record a new edit when changing fields, never every keystroke.
      if (lastEditedField.current === name) return;
      lastEditedField.current = name;
    } else {
      if (fieldResults.current.get(name) === stage) return;
      fieldResults.current.set(name, stage);
    }
    emitTrialDiagnostic({ kind: 'form_step', target: trialFieldTarget(name, stage) });
  }
  useEffect(() => {
    // Preserve values filled by the browser before hydration finishes.
    setData(previous => trialFormValues(formRef.current, previous));
    setInteractive(true);
  }, []);

  useEffect(() => {
    if (!interactive || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
        const name = entry.target.getAttribute('data-trial-field') as TrialField;
        if (TRIAL_FIELDS.includes(name)) measureField(name, 'view');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.55 });
    formRef.current?.querySelectorAll('[data-trial-field]').forEach(field => observer.observe(field));
    return () => observer.disconnect();
  }, [interactive, step]);

  const focusError = (next: Partial<Record<TrialField, string>>) => {
    const first = TRIAL_STEPS[step].find(field => next[field]) || TRIAL_FIELDS.find(field => next[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>(`#trial-${first}`)?.focus());
  };
  useEffect(() => {
    if (!state.error) return;
    setSubmittedError(true);
    emitTrialDiagnostic({ kind: 'form_error', target: state.code || 'interrupted' });
    const next = state.fieldErrors || {};
    for (const field of TRIAL_FIELDS) if (next[field]) measureField(field, 'invalid');
    setErrors(next);
    if (next.workshopName || next.fullName) setStep(0);
    focusError(next);
  }, [state]);

  function validate(event: React.FormEvent<HTMLFormElement>) {
    // Password managers and browser autofill can update the displayed inputs
    // without emitting React's change event. Validate the actual submitted values
    // and retain them when changing steps, rather than treating them as empty.
    const values = readCurrentForm(event.currentTarget);
    const next = validateTrialStep(values, step);
    for (const field of TRIAL_STEPS[step]) measureField(field, next[field] ? 'invalid' : 'valid');
    setData(values);
    setSubmittedError(false);
    setErrors(next);
    if (Object.keys(next).length) {
      event.preventDefault();
      emitTrialDiagnostic({ kind: 'form_error', target: 'validation' });
      focusError(next);
      return;
    }
    if (step === 0) {
      event.preventDefault();
      setStep(1);
      emitTrialDiagnostic({ kind: 'form_step', target: 'access' });
      // Focus the heading after an intentional step; don't open a phone keyboard
      // or count programmatic focus as form engagement on page load.
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: false }));
    } else emitTrialDiagnostic({ kind: 'form_submit', target: 'activate' });
  }

  return <section id="trial-registration" className="min-w-0 scroll-mt-6 rounded-2xl border border-white/15 bg-[#0d1b2e] p-5 shadow-2xl shadow-black/20 sm:p-7" aria-label="Crear tu taller gratis">
    <ol className="mb-5 flex gap-3 text-xs" aria-label="Pasos para crear tu taller">
      {['Tu taller', 'Tu acceso'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={'flex flex-1 items-center gap-2 border-b-2 pb-3 font-semibold '+(index <= step ? 'border-orange-400 text-orange-200' : 'border-white/10 text-slate-400')}><span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full '+(index < step ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10')}>{index < step ? <Check size={14}/> : index+1}</span>{label}</li>)}
    </ol>
    <h2 ref={heading} tabIndex={-1} className="text-xl font-bold tracking-tight outline-none sm:text-2xl">{step === 0 ? 'Empecemos por tu taller' : 'Ya casi está tu taller'}</h2>
    <p className="mb-5 mt-2 text-sm leading-6 text-slate-300">{step === 0 ? 'Solo necesitas estos datos y crear tu acceso. La ciudad y el resto del perfil los completas después.' : `Crea tu acceso para ${data.workshopName}. No necesitas tarjeta ni esperar una llamada para entrar.`}</p>
    <form ref={formRef} action={action} noValidate onSubmit={validate} data-trial-form="v2" className="space-y-4">
      {TRIAL_STEPS[step].map(name => {
        const field = fields[name];
        return <div key={name} data-trial-field={name}>
          <label htmlFor={'trial-'+name} className="block text-sm font-semibold text-slate-100">{field.label}</label>
          <div className="relative mt-2">
            <input id={'trial-'+name} name={name} type={name === 'password' && showPassword ? 'text' : field.type}
              autoComplete={field.autoComplete} placeholder={field.placeholder} maxLength={field.maxLength} required value={data[name]}
              inputMode={name === 'phone' ? 'tel' : name === 'email' ? 'email' : undefined} autoCapitalize={name === 'email' ? 'none' : undefined} spellCheck={name === 'email' || name === 'password' ? false : undefined}
              aria-invalid={!!errors[name]} aria-describedby={[errors[name] ? 'trial-'+name+'-error' : '', ['phone','password'].includes(name) ? 'trial-'+name+'-help' : '', name === 'phone' ? 'trial-phone-purpose' : ''].filter(Boolean).join(' ') || undefined}
              onChange={event => { setData(readCurrentForm(event.currentTarget.form)); setErrors(current => ({ ...current, [name]: undefined })); measureField(name, 'edit'); }}
              onBlur={event => { const values = readCurrentForm(event.currentTarget.form); if (values[name].trim() && !validateTrialStep(values, step)[name]) measureField(name, 'valid'); }}
              className={'h-12 w-full rounded-xl border bg-[#071221] px-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 '+(errors[name] ? 'border-red-400' : 'border-white/20')+(name === 'password' ? ' pr-12' : '')}/>
            {name === 'password' && <button type="button" onClick={() => { setData(readCurrentForm(formRef.current)); setShowPassword(current => !current); }} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-slate-300 hover:bg-white/5">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>}
          </div>
          {name === 'phone' && <>
            <p id="trial-phone-help" className="mt-1.5 text-xs leading-5 text-slate-400">En Colombia escribe tus 10 dígitos, sin +57. Otro país: incluye el indicativo.</p>
            <div id="trial-phone-purpose" className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs leading-5 text-slate-300">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300"/>
              <div><p className="font-semibold text-emerald-100">Tu enlace de acceso, a la mano</p><p className="mt-1">Te enviaremos la bienvenida y el enlace a tu taller. Este registro no conecta tu WhatsApp ni permite leer tus chats.</p><p className="mt-1 text-slate-400">Las promociones solo si tú las eliges, abajo.</p></div>
            </div>
          </>}
          {name === 'password' && <p id="trial-password-help" className="mt-1.5 text-xs leading-5 text-slate-400">Mínimo 10 caracteres. Puedes usar una frase que recuerdes.</p>}
          {errors[name] && <p id={'trial-'+name+'-error'} role="alert" className="mt-1.5 text-xs leading-5 text-red-200">{errors[name]}</p>}
        </div>;
      })}
      {TRIAL_FIELDS.filter(name => !TRIAL_STEPS[step].includes(name)).map(name => <input key={'hidden-'+name} type="hidden" name={name} value={data[name]}/>)}
      <input type="hidden" name="termsAcknowledged" value="yes"/>
      <input type="hidden" name="welcomeRequested" value="yes"/>
      <input type="hidden" name="marketingRequested" value={marketingRequested ? 'yes' : 'no'}/>
      <div className="hidden" aria-hidden="true"><label htmlFor="trial-website">Sitio web</label><input id="trial-website" name="website" tabIndex={-1} autoComplete="off"/></div>
      {step === 1 && <>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3 text-xs leading-5 text-slate-300">
          <input id="trial-marketing" type="checkbox" checked={marketingRequested} onChange={event => { setData(readCurrentForm(formRef.current)); setMarketingRequested(event.currentTarget.checked); }} className="mt-1 h-4 w-4 shrink-0 accent-orange-400"/>
          <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-100">Quiero consejos y promociones</span><span className="mt-1 block"><span className="text-orange-200">Opcional</span> · Por WhatsApp, de MotoManager. La prueba se activa igual sin marcarlo. Puedes pedir dejar de recibirlos.</span></span>
        </label>
        <p className="text-[11px] leading-5 text-slate-400">Al crear tu taller, solicitas la bienvenida por WhatsApp y aceptas la prueba Full de 15 días por taller, correo y celular, sin cobros automáticos, y el tratamiento de datos para gestionar tu cuenta.</p>
      </>}
      {submittedError && state.error && <div role="alert" className="rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm leading-6 text-red-100"><p>{state.error}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 font-semibold"><Link href="/login?redirect=/dashboard" className="underline underline-offset-4">Iniciar sesión</Link><Link href="/login?recovery=1" className="underline underline-offset-4">Recuperar contraseña</Link></div></div>}
      <FormControls step={step} interactive={interactive} back={() => { setData(readCurrentForm(formRef.current)); setStep(0); setSubmittedError(false); }}/>
    </form>
    <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><LockKeyhole size={13} className="shrink-0"/>Tus datos gestionan tu cuenta. Tú eliges si recibes promociones.</p>
    <p className="mt-4 border-t border-white/10 pt-4 text-center text-xs text-slate-300">¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-orange-200 underline underline-offset-4">Inicia sesión</Link></p>
  </section>;
}

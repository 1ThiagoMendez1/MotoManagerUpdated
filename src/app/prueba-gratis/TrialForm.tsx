'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { startFullTrial } from './actions';
import { TRIAL_WHATSAPP_CONSENT_TEXT } from '@/lib/subscription-trial';

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 font-extrabold text-[#081121] transition hover:bg-[#ffa149] disabled:opacity-60">
    {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Activando tu taller…</> : <>Activar mis 15 días gratis <ArrowRight className="h-5 w-5" /></>}
  </button>;
}

export function TrialForm() {
  const [state, action] = useActionState(startFullTrial, { error: '' });
  const fields = [
    { name: 'fullName', label: 'Tu nombre completo', autoComplete: 'name', placeholder: 'Juan Pérez', maxLength: 120 },
    { name: 'workshopName', label: 'Nombre de tu taller', autoComplete: 'organization', placeholder: 'Mi taller de motos', maxLength: 120 },
    { name: 'email', label: 'Correo electrónico', type: 'email', autoComplete: 'email', placeholder: 'tu@correo.com', maxLength: 254 },
    { name: 'phone', label: 'Celular / WhatsApp', type: 'tel', autoComplete: 'tel', placeholder: '300 123 4567', maxLength: 25 },
    { name: 'city', label: 'Ciudad', autoComplete: 'address-level2', placeholder: 'Bogotá', maxLength: 120 },
    { name: 'password', label: 'Crea tu contraseña', type: 'password', autoComplete: 'new-password', placeholder: 'Mínimo 10 caracteres', maxLength: 128 },
  ];
  return <form action={action} className="space-y-4">
    {fields.map(field => <div key={field.name}>
      <label htmlFor={`trial-${field.name}`} className="mb-1.5 block text-sm font-semibold text-slate-200">{field.label}</label>
      <input {...field} id={`trial-${field.name}`} required minLength={field.name === 'password' ? 10 : undefined} className="min-h-12 w-full rounded-xl border border-white/20 bg-[#081121] px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#ff831b] focus:ring-2 focus:ring-[#ff831b]/20" />
    </div>)}
    <div aria-hidden="true" className="hidden"><label htmlFor="trial-website">Sitio web</label><input id="trial-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
      <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 shrink-0 accent-[#ff831b]" />
      <span>Acepto las condiciones: una prueba de 15 días por taller, correo y celular. Al finalizar elegiré un plan para continuar. No hay cobros automáticos durante la prueba. Mis datos de contacto se usarán para crear y gestionar mi cuenta.</span>
    </label>
    <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
      <input type="checkbox" name="whatsappConsent" className="mt-1 h-4 w-4 shrink-0 accent-[#ff831b]" />
      <span>{TRIAL_WHATSAPP_CONSENT_TEXT} <span className="text-slate-400">(Opcional)</span></span>
    </label>
    {state.error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p>}
    <Submit />
    <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><LockKeyhole className="h-3.5 w-3.5" />Sin tarjeta. Sin permanencia. Tú decides si sigues.</p>
    <p className="text-center text-sm text-slate-300">¿Ya tienes cuenta? <Link href="/login" className="font-bold text-[#ffad68] underline underline-offset-4">Inicia sesión</Link></p>
  </form>;
}

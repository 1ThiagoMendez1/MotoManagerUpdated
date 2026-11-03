'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bike, CheckCircle2, ChevronLeft, KeyRound, Loader2, LockKeyhole, MessageCircle, ShieldCheck, Smartphone, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { requestCustomerPortalCode, verifyCustomerPortalCode } from './acceso/actions';

export function CustomerPortalAccess() {
  const router = useRouter();
  const [mode, setMode] = useState<'whatsapp'|'email'>('whatsapp');
  const [step, setStep] = useState<'phone'|'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  async function sendCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || seconds > 0) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await requestCustomerPortalCode(phone);
      if (result.error) setError(result.error);
      else {
        setStep('code');
        setNotice('Si tu número está vinculado a un taller, recibirás un código de WhatsApp. Revisa tus mensajes.');
      }
      if (result.retryAfterSeconds) setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
    } catch { setError('Comprueba la conexión e intenta nuevamente.'); }
    finally { setBusy(false); }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await verifyCustomerPortalCode({ phone, code: code.trim() });
      if (result.success) { router.replace('/clientes'); router.refresh(); }
      else setError(result.error || 'No se pudo comprobar el código.');
    } catch { setError('No se pudo comprobar el acceso. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (signInError) setError('Revisa tu correo y contraseña. Esta opción es para cuentas anteriores.');
      else { router.replace('/clientes'); router.refresh(); }
    } catch { setError('No se pudo iniciar sesión. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#071222] px-4 py-9 text-white sm:py-16">
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-44 h-[450px] w-[450px] rounded-full bg-orange-400/10 blur-[110px]" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-400/10 blur-[110px]" />
    <div className="relative mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-tight text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-400"><Wrench size={21}/></span>
          MotoManager
        </Link>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-200 sm:text-xs">Mi garaje · Clientes</span>
      </header>
      <div className="grid items-center gap-9 lg:grid-cols-[1fr_440px] lg:gap-14">
        <section className="order-2 space-y-6 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-xs font-bold text-orange-200"><Bike size={15}/> El espacio de tu moto</span>
          <h1 className="max-w-xl text-4xl font-black leading-[1.09] tracking-tight sm:text-5xl">Tu moto tiene historia. <span className="text-orange-400">Aquí la tienes a mano.</span></h1>
          <p className="max-w-lg text-sm leading-7 text-slate-300 sm:text-base">Si ya te registraste en un taller con MotoManager, entra sin memorizar una contraseña y consulta solo la información que tu taller ha vinculado contigo.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Tus motocicletas','Encuentra las motos asociadas a tu ficha.'],
              ['Estado del servicio','Revisa tus órdenes y cotizaciones.'],
              ['Tus citas','Agenda y consulta tus próximas visitas.'],
              ['Historial y opiniones','Revisa servicios y califica trabajos entregados.'],
            ].map(([title,description],i)=><div key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300">{['01','02','03','04'][i]}</span>
              <h2 className="text-sm font-bold">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>)}
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/>No basta con conocer una placa. Tu taller debe haberte registrado y tu acceso debe estar verificado.</p>
        </section>
        <section aria-labelledby="customer-access-heading" className="order-1 rounded-[28px] border border-white/15 bg-[#101d30]/95 p-5 shadow-2xl shadow-black/40 sm:p-8 lg:order-2">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-orange-400/15 text-orange-400"><LockKeyhole size={23}/></span>
          <h2 id="customer-access-heading" className="text-2xl font-black tracking-tight">Entra a Mi garaje</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Solo para clientes vinculados a un taller MotoManager.</p>
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-950/60 p-1" role="group" aria-label="Método de ingreso">
            <button type="button" aria-pressed={mode==='whatsapp'} onClick={()=>{setMode('whatsapp');setError('');setNotice('');}}
              className={'rounded-lg px-2 py-3 text-xs font-bold sm:text-sm '+(mode==='whatsapp'?'bg-orange-500 text-slate-950':'text-slate-300 hover:bg-white/5')}>Por WhatsApp</button>
            <button type="button" aria-pressed={mode==='email'} onClick={()=>{setMode('email');setError('');setNotice('');}}
              className={'rounded-lg px-2 py-3 text-xs font-bold sm:text-sm '+(mode==='email'?'bg-orange-500 text-slate-950':'text-slate-300 hover:bg-white/5')}>Correo anterior</button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm leading-5 text-sky-100">{notice}</p>}
          {mode==='whatsapp' && step==='phone' && <form onSubmit={sendCode} className="mt-5 space-y-4">
            <label htmlFor="customer-phone" className="block text-sm font-semibold text-slate-100">Celular registrado</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-950/70 px-4 focus-within:border-orange-400">
              <Smartphone className="h-5 w-5 shrink-0 text-slate-400"/>
              <input id="customer-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                placeholder="300 123 4567" minLength={10} maxLength={22} required className="h-14 w-full min-w-0 bg-transparent text-base text-white outline-none placeholder:text-slate-500"/>
            </div>
            <p className="text-xs leading-5 text-slate-400">Usa el mismo número con el que te registraste por QR. Admitimos números colombianos (+57).</p>
            <button disabled={busy || seconds>0} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-extrabold text-slate-950 hover:bg-orange-400 disabled:opacity-60">
              {busy?<Loader2 className="h-5 w-5 animate-spin"/>:<MessageCircle className="h-5 w-5"/>}
              {seconds>0?'Reintenta en '+seconds+' s':'Recibir código por WhatsApp'} <ArrowRight size={18}/>
            </button>
          </form>}
          {mode==='whatsapp' && step==='code' && <form onSubmit={verify} className="mt-5 space-y-4">
            <p className="text-sm text-slate-300">Ingresa el código enviado a <strong className="text-white">{phone}</strong>. Expira en cinco minutos.</p>
            <label htmlFor="customer-code" className="block text-sm font-semibold">Código de seis dígitos</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-950/70 px-4 focus-within:border-orange-400">
              <KeyRound className="h-5 w-5 text-slate-400"/>
              <input id="customer-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
                value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
                minLength={6} maxLength={6} pattern="[0-9]{6}" required placeholder="123456"
                className="h-14 w-full bg-transparent text-center text-2xl font-black tracking-[.35em] text-white outline-none placeholder:text-slate-600"/>
            </div>
            <button disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-extrabold text-slate-950 hover:bg-orange-400 disabled:opacity-60">
              {busy?<Loader2 className="h-5 w-5 animate-spin"/>:<CheckCircle2 className="h-5 w-5"/>} Verificar y entrar
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={()=>{setStep('phone');setCode('');setError('');setNotice('');}} className="flex items-center gap-1 text-xs text-slate-300 hover:text-white"><ChevronLeft size={15}/> Cambiar número</button>
              <button type="button" disabled={busy || seconds>0} onClick={()=>void sendCode()} className="text-xs font-bold text-orange-300 disabled:opacity-50">{seconds>0?'Reenviar en '+seconds+' s':'Reenviar código'}</button>
            </div>
          </form>}
          {mode==='email' && <form onSubmit={signInWithEmail} className="mt-5 space-y-4">
            <p className="text-xs leading-5 text-slate-400">Solo si tu taller te vinculó previamente con correo y contraseña. No crea cuentas nuevas.</p>
            <label className="block text-sm font-semibold">Correo electrónico
              <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="tu@correo.com" className="mt-2 h-14 w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 text-white outline-none focus:border-orange-400"/>
            </label>
            <label className="block text-sm font-semibold">Contraseña
              <input type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={e=>setPassword(e.target.value)}
                className="mt-2 h-14 w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 text-white outline-none focus:border-orange-400"/>
            </label>
            <button disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-extrabold text-slate-950 hover:bg-orange-400 disabled:opacity-60">
              {busy&&<Loader2 className="h-5 w-5 animate-spin"/>} Entrar con mi cuenta <ArrowRight size={18}/>
            </button>
          </form>}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-center text-xs leading-5 text-slate-400">¿Todavía no te has registrado en un taller?</p>
            <Link href="/#workshops" className="mt-3 block rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white hover:bg-white/10">Busca tu taller o solicita su QR</Link>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>Tu código es privado. MotoManager no te pedirá compartirlo por teléfono o chat.</p>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

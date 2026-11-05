'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Storefront } from '@/lib/workshops/enrollment';
import { workshopAuthFailure } from '@/lib/workshops/email-auth';
import { enrollCustomer, requestAnotherMotorcycle } from './actions';
import { requestWorkshopWhatsApp, verifyWorkshopWhatsApp } from './whatsapp-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, CheckCircle2, LockKeyhole, Loader2, Phone, ShieldCheck } from 'lucide-react';

export default function EnrollmentForm({ workshop, email, alreadyLinked, authError }: {
  workshop: Storefront; email: string | null; alreadyLinked: boolean; authError: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'whatsapp' | 'password'>('whatsapp');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [complete, setComplete] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState('');
  const [addMoto, setAddMoto] = useState(false);
  const [error, setError] = useState(authError ? 'El enlace anterior ya no está disponible. Accede con WhatsApp o utiliza tu contraseña.' : '');

  useEffect(() => {
    if (!retryAt) return;
    const tick = () => setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  async function sendCode(phoneNumber: string) {
    if (busy || Date.now() < retryAt) return;
    setBusy(true); setError('');
    try {
      const result = await requestWorkshopWhatsApp({ slug: workshop.slug, phone: phoneNumber });
      if (result.retryAfterSeconds) {
        setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
        setRetrySeconds(result.retryAfterSeconds);
      }
      if (result.error) setError(result.error);
      else if (result.success) { setPhone(phoneNumber); setCodeSent(true); }
    } catch { setError('Comprueba tu conexión e intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const result = await verifyWorkshopWhatsApp({
        slug: workshop.slug, phone, code: String(form.get('code') || ''),
      });
      if (result.error) setError(result.error);
      else if (result.success) router.refresh();
    } catch { setError('No fue posible verificar el código.'); }
    finally { setBusy(false); }
  }

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get('email') || '').trim().toLowerCase(),
        password: String(form.get('password') || ''),
      });
      if (error) setError(workshopAuthFailure(error, 'password').error);
      else router.refresh();
    } catch { setError('Comprueba tu conexión e intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    data.set('slug', workshop.slug);
    try {
      const result = await enrollCustomer(data);
      if (result.error) setError(result.error);
      else { setComplete(true); setIntakeNotice(result.intakeWarning || ''); router.refresh(); }
    } catch { setError('No se pudo completar el registro. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  async function addAnother(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    data.set('slug', workshop.slug);
    try {
      const result = await requestAnotherMotorcycle(data);
      if (result.error) setError(result.error);
      else { setAddMoto(false); setIntakeNotice('¡Listo! Recepción ya tiene tu placa pendiente de validación.'); }
    } catch { setError('No se pudo enviar la moto. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  if (alreadyLinked || complete) return <div role="status" className="space-y-5 text-center">
    <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
    <h2 className="text-2xl font-bold">Ya eres parte de {workshop.name}</h2>
    <p className="text-muted-foreground">Tu cuenta está vinculada con el taller. Puedes acceder a tus motos asociadas, consultar sus órdenes y gestionar citas desde el portal.</p>
    <Button className="w-full" asChild><Link href="/clientes">Ir a mi portal <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    {intakeNotice && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">{intakeNotice}</p>}
    <Button className="w-full" variant="outline" onClick={() => setAddMoto(!addMoto)}>+ Informar otra motocicleta al taller</Button>
    {addMoto && <form onSubmit={addAnother} className="space-y-3 rounded-xl border p-4 text-left">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <label className="block text-sm font-medium">Placa<Input name="plate" required placeholder="ABC12D" maxLength={12} /></label>
      <label className="block text-sm font-medium">Marca (opcional)<Input name="brand" placeholder="Yamaha" maxLength={60} /></label>
      <label className="block text-sm font-medium">Modelo (opcional)<Input name="model" placeholder="FZ 2.0" maxLength={60} /></label>
      <Button className="w-full" disabled={busy}>{busy ? 'Enviando...' : 'Avisar a recepción'}</Button>
    </form>}
    <p className="text-xs text-muted-foreground">¿No aparece tu moto? Pide al taller que la asocie con tu ficha. No necesitas registrarte otra vez.</p>
  </div>;

  if (!workshop.enrollmentEnabled) return <div role="status" className="space-y-5">
    <div className="flex items-center gap-3"><LockKeyhole className="h-9 w-9 text-primary" /><h2 className="text-xl font-bold">Registro temporalmente pausado</h2></div>
    <p className="text-sm leading-relaxed text-muted-foreground">Este QR sí es de {workshop.name}. Por ahora el taller no está recibiendo registros nuevos. No necesitas escanear otro código.</p>
    {workshop.phone && <Button className="w-full" variant="outline" asChild>
      <a href={`tel:${workshop.phone.replace(/[^+\\d]/g, '')}`}><Phone className="mr-2 h-4 w-4" />Llamar al taller</a>
    </Button>}
    <Button className="w-full" variant="outline" onClick={() => router.refresh()}>Volver a comprobar</Button>
    <p className="text-xs text-muted-foreground">Si administras el taller, activa el registro desde Mi perfil → QR del taller.</p>
  </div>;

  return <>
    {error && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {!email ? <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Accede a tu taller por WhatsApp</h2>
        <p className="mt-2 text-sm text-muted-foreground">Confirma tu celular mediante un código seguro y vincúlate con {workshop.name}. No necesitas recibir correos.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1" role="group" aria-label="Método de acceso">
        <button type="button" aria-pressed={mode === 'whatsapp'}
          onClick={() => { setMode('whatsapp'); setError(''); }}
          className={'rounded-lg px-2 py-3 text-sm font-semibold ' +
            (mode === 'whatsapp' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Por WhatsApp</button>
        <button type="button" aria-pressed={mode === 'password'}
          onClick={() => { setMode('password'); setError(''); }}
          className={'rounded-lg px-2 py-3 text-sm font-semibold ' +
            (mode === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Correo y contraseña</button>
      </div>
      {mode === 'whatsapp' ? (codeSent
        ? <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-muted-foreground">Solicitamos un código de seis dígitos para <strong>{phone}</strong>. Consulta tu WhatsApp.</p>
          <label className="block space-y-2 text-sm font-medium">Código de verificación
            <Input name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code"
              minLength={6} maxLength={6} required placeholder="123456" />
          </label>
          <Button className="h-12 w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verificar y continuar</Button>
          <Button type="button" className="w-full" variant="outline" disabled={busy || retrySeconds > 0}
            onClick={() => void sendCode(phone)}>
            {retrySeconds > 0 ? 'Reenviar en ' + retrySeconds + ' s' : 'Solicitar otro código'}
          </Button>
          <Button type="button" className="w-full" variant="ghost" onClick={() => { setCodeSent(false); setError(''); }}>
            Cambiar celular
          </Button>
        </form>
        : <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget);
            void sendCode(String(form.get('phone') || '')); }} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">Tu celular con WhatsApp
            <Input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={22}
              defaultValue={phone} placeholder="300 123 4567" />
          </label>
          <p className="text-xs text-muted-foreground">Te enviaremos un único código de acceso. No compartas el código con nadie. Por ahora se admiten números de Colombia (+57).</p>
          <Button className="h-12 w-full" disabled={busy || retrySeconds > 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {retrySeconds > 0 ? 'Reintentar en ' + retrySeconds + ' s' : 'Recibir código por WhatsApp'}
          </Button>
        </form>)
        : <form onSubmit={signInWithPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">Si ya tienes un historial asociado a tu correo, entra con tu contraseña para conservar tus motos y órdenes.</p>
          <label className="block space-y-2 text-sm font-medium">Correo electrónico
            <Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" />
          </label>
          <label className="block space-y-2 text-sm font-medium">Contraseña
            <Input name="password" type="password" autoComplete="current-password" required maxLength={200} />
          </label>
          <Button className="h-12 w-full" disabled={busy}>Entrar con mi contraseña</Button>
        </form>}
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />
        Verificar el número no vincula ninguna motocicleta automáticamente: el taller debe confirmar sus datos.</p>
    </div> : <form onSubmit={join} className="space-y-5">
      <div><h2 className="text-xl font-semibold">Un último paso</h2><p className="mt-2 break-words text-sm text-muted-foreground">Acceso verificado</p><p className="mt-2 text-sm text-muted-foreground">Estos datos se utilizarán solo para vincular tu ficha con {workshop.name}.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Nombres<Input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label className="space-y-2 text-sm font-medium">Apellidos<Input name="lastName" autoComplete="family-name" required maxLength={100} /></label>
      </div>
      <label className="block space-y-2 text-sm font-medium">Celular de contacto<Input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={22} defaultValue={phone} placeholder="300 123 4567" /><span className="block text-xs font-normal text-muted-foreground">Incluye el indicativo si tu número es de otro país.</span></label>
      <div className="space-y-3 rounded-xl border bg-primary/5 p-4">
        <h3 className="font-semibold">🏍️ ¿Qué moto tienes?</h3>
        <p className="text-xs text-muted-foreground">Con la placa, el taller podrá prepararte una recepción rápida. No se agregará a tu historial hasta que el taller la confirme.</p>
        <label className="block space-y-1 text-sm font-medium">Placa de tu motocicleta (recomendada)<Input name="plate" placeholder="ABC12D" maxLength={16} autoCapitalize="characters" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm font-medium">Marca<Input name="brand" placeholder="Honda" maxLength={60} /></label>
          <label className="space-y-1 text-sm font-medium">Modelo<Input name="model" placeholder="CB 125" maxLength={60} /></label>
        </div>
        <p className="text-xs text-muted-foreground">¿No conoces la placa o no tienes moto todavía? Puedes continuar.</p>
      </div>
      <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="consent" type="checkbox" required className="mt-1" /><span>Autorizo a {workshop.name} a usar mi nombre, correo y teléfono para crear o vincular mi ficha y gestionar la relación de servicio. Puedo solicitar la actualización o eliminación de mis datos directamente al taller. Esto no autoriza mensajes publicitarios.</span></label>
      <Button className="h-12 w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vincularme a {workshop.name}</Button>
    </form>}
  </>;
}

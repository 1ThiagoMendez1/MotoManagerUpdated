'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Storefront, workshopPath } from '@/lib/workshops/enrollment';
import { enrollCustomer } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Mail, Loader2 } from 'lucide-react';

export default function EnrollmentForm({ workshop, email, authError }: { workshop: Storefront; email: string | null; authError: boolean }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(authError ? 'El enlace expiró o ya se utilizó. Solicita uno nuevo y ábrelo en este navegador.' : '');

  async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const returnPath = workshopPath(workshop.slug);
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', returnPath);
      const { error } = await supabase.auth.signInWithOtp({
        email: String(data.get('email')).trim().toLowerCase(),
        options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
      });
      if (error) setError('No se pudo enviar el enlace. Espera un momento e intenta de nuevo.');
      else setSent(true);
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
      else setComplete(true);
    } catch { setError('No se pudo completar el registro. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  if (complete) return <div role="status" className="space-y-4 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h2 className="text-2xl font-bold">Ya eres parte de {workshop.name}</h2><p className="text-muted-foreground">Tu registro está listo. Al llegar al taller, indica tu correo para que encuentren tu ficha.</p><p className="text-sm">¡Nos vemos en tu próxima visita!</p></div>;
  if (sent) return <div role="status" className="space-y-4"><Mail className="h-9 w-9 text-primary" /><h2 className="text-xl font-semibold">Revisa tu correo</h2><p className="text-sm text-muted-foreground">Abre el enlace de acceso en este mismo navegador para verificar tu correo y terminar tu registro. Revisa también la carpeta de spam.</p><Button variant="outline" onClick={() => setSent(false)}>Usar otro correo</Button></div>;
  return <>
    {error && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {!email ? <form onSubmit={verifyEmail} className="space-y-5">
      <div><h2 className="text-xl font-semibold">Tu taller, a un escaneo</h2><p className="mt-2 text-sm text-muted-foreground">Sin contraseñas nuevas. Te enviaremos un enlace para verificar tu correo.</p></div>
      <label className="block space-y-2 text-sm font-medium">Correo electrónico<Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" /></label>
      <Button className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continuar con mi correo</Button>
    </form> : <form onSubmit={join} className="space-y-5">
      <div><h2 className="text-xl font-semibold">Un último paso</h2><p className="mt-2 break-all text-sm text-muted-foreground">Correo verificado: {email}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Nombres<Input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label className="space-y-2 text-sm font-medium">Apellidos<Input name="lastName" autoComplete="family-name" required maxLength={100} /></label>
      </div>
      <label className="block space-y-2 text-sm font-medium">Celular de contacto<Input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={22} placeholder="300 123 4567" /><span className="block text-xs font-normal text-muted-foreground">Incluye el indicativo si tu número es de otro país.</span></label>
      <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="consent" type="checkbox" required className="mt-1" /><span>Autorizo a {workshop.name} a usar mi nombre, correo y teléfono para crear o vincular mi ficha y gestionar la relación de servicio. Puedo solicitar la actualización o eliminación de mis datos directamente al taller. Esto no autoriza mensajes publicitarios.</span></label>
      <Button className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vincularme a {workshop.name}</Button>
    </form>}
  </>;
}

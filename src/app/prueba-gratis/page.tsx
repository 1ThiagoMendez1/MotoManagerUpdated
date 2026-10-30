import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, ArrowLeft, Gift, Sparkles } from 'lucide-react';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { TrialForm } from './TrialForm';
import { isHalloweenEditionActive } from '@/lib/seasonal-campaign';
import { HalloweenDecor } from '../planes/components/HalloweenDecor';
import halloweenStyles from '../planes/components/halloween.module.css';

export const metadata: Metadata = {
  title: '15 días gratis con Full Taller | MotoManager',
  description: 'Prueba MotoManager Full durante 15 días con tus propios clientes, motos y órdenes. Sin tarjeta y sin cobros automáticos. Crea tu taller y empieza hoy.',
};

export default async function TrialPage() {
  const halloween = isHalloweenEditionActive();
  const user = await getCurrentUserServer();
  if (user?.workshopId) {
    const workshop = await getWorkshopDetails(user);
    redirect(workshop?.trial_expired ? '/dashboard/subscription' : `/${workshop?.slug || 'dashboard'}`);
  }
  return <div className={`min-h-screen bg-[#050b18] px-5 py-7 text-white sm:py-10 ${halloween ? halloweenStyles.signup : ''}`}>
    {halloween && <HalloweenDecor kind="web" className={halloweenStyles.webRight} />}
    <div className={`mx-auto max-w-6xl ${halloween ? halloweenStyles.signupInner : ''}`}>
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Volver a MotoManager</Link>
      <div className="mt-9 grid items-start gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-20">
        <div className="lg:sticky lg:top-10">
          <Link href="/" className="flex items-center gap-3"><Image src="/logo.png" alt="MotoManager" width={60} height={60} /><span className="text-2xl font-extrabold tracking-tight">MotoManager</span></Link>
          {halloween ? <span className={halloweenStyles.signupBadge}><HalloweenDecor kind="pumpkin" />HALLOWEEN EDITION · 15 DÍAS GRATIS</span> : <span className="mt-9 inline-flex items-center gap-2 rounded-full border border-[#ff831b]/35 bg-[#ff831b]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#ffad68]"><Gift className="h-4 w-4" />Full Taller · 15 días gratis</span>}
          <h1 className={`mt-6 text-4xl font-extrabold leading-[1.1] tracking-[-0.045em] sm:text-5xl ${halloween ? halloweenStyles.signupTitle : ''}`}>{halloween ? 'Dale vida a tu taller.' : 'Descubre cuánto puede dar tu taller.'}<span className="mt-2 block text-[#ff831b]">{halloween ? 'El trato empieza por $0.' : 'El primer paso cuesta $0.'}</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">{halloween ? 'Un trato de miedo, sin trucos: estrena Full con tus propios clientes, motos y equipo. Sin tarjeta y sin cobros automáticos.' : 'No te quedes imaginando cómo sería. Trabaja con tus clientes, tus motos y tu equipo en el plan más completo de MotoManager.'}</p>
          <ul className="mt-7 space-y-4 text-sm text-slate-200">
            {['Órdenes, clientes e historial de cada moto.', 'Inventario, ventas, caja y contabilidad.', 'Agenda, técnicos, equipo y permisos Full.', 'Portal y QR para tus clientes.', 'WhatsApp según la configuración del proveedor.'].map(text => <li key={text} className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#ffad68]" />{text}</li>)}
          </ul>
          <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-5"><p className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-[#ffad68]" />Empieza gratis. Crece a tu ritmo.</p><p className="mt-2 text-sm leading-7 text-slate-300">La prueba comienza al crear tu taller. Al terminar, elige Básico, Pro o sigue con Full. Conservas tu información al contratar; no necesitas registrarlo todo de nuevo.</p></div>
          {halloween && <div className={halloweenStyles.signupArt}><Image src="/campaigns/halloween-garage-2026.webp" alt="Moto y calabazas de la edición Halloween de MotoManager" fill unoptimized sizes="(min-width: 1024px) 440px, 1px" /></div>}
        </div>
        <div className={`rounded-3xl border border-white/15 bg-[#0e1a2e] p-6 shadow-2xl sm:p-8 ${halloween ? halloweenStyles.signupCard : ''}`}>
          <div className="mb-6 border-b border-white/10 pb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffad68]">{halloween ? 'TRATO HECHO. SIN TRUCOS.' : 'Tu taller empieza aquí'}</p><h2 className="mt-2 text-2xl font-bold">Activa tu cuenta Full</h2><p className="mt-2 text-sm text-slate-300">15 días para vivir el cambio con tu operación real.</p></div>
          {user ? <p className="text-sm leading-7 text-slate-200">Tu sesión ya está abierta. <Link href="/no-workshop" className="text-[#ffad68] underline">Revisa tu cuenta</Link> o cierra sesión para registrar un taller nuevo.</p> : <TrialForm />}
        </div>
      </div>
    </div>
  </div>;
}

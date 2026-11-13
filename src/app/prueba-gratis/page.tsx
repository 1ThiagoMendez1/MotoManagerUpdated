import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardList, Gift, MessageCircle, ShieldCheck, Wallet } from 'lucide-react';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { TrialForm } from './TrialForm';
import { PhoneAccessForm } from '@/components/auth/PhoneAccessForm';
import { phoneAuthEnabled } from '@/lib/workshop-phone-auth-server';
import { PHONE_AUTH_CAMPAIGN } from '@/lib/workshop-phone-shared';
import { TRIAL_FIELD_CAMPAIGN } from '@/lib/analytics/trial-fields';

export const metadata: Metadata = {
  title: 'Crea tu taller · 15 días de Full gratis | MotoManager',
  description: 'Prueba MotoManager con las motos, órdenes y repuestos de tu taller. 15 días de Full por $0, sin tarjeta ni cobros automáticos.',
};

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ method?: string }> }) {
  const user = await getCurrentUserServer();
  if (user?.workshopId) {
    const workshop = await getWorkshopDetails(user);
    redirect(workshop?.trial_expired ? '/dashboard/subscription' : '/' + (workshop?.slug || 'dashboard'));
  }
  const phoneEnabled = phoneAuthEnabled() && (await searchParams).method !== 'email';
  return <main data-campaign={phoneEnabled ? PHONE_AUTH_CAMPAIGN : TRIAL_FIELD_CAMPAIGN} className="relative min-h-dvh overflow-x-clip bg-[#050b18] px-4 pb-10 pt-4 text-white sm:px-6 sm:py-7">
    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-80 w-72 rounded-full bg-orange-500/5 blur-3xl"/>
    <div className="relative mx-auto w-full max-w-6xl">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight"><Image src="/logo.png" alt="" width={36} height={36} priority/>MotoManager</Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white"><ArrowLeft size={14}/> Volver a la web</Link>
      </header>
      <div className="grid items-start gap-7 pt-5 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-14">
        <section className="lg:sticky lg:top-12" aria-labelledby="trial-title">
          <p className="inline-flex items-center gap-2 text-xs font-bold text-orange-200"><Gift size={17}/> 15 días de Full · Hoy pagas $0</p>
          <h1 id="trial-title" className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-[-.045em] sm:text-4xl lg:text-5xl">Tu taller más organizado.<span className="text-orange-400"> Empieza gratis.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">Crea tu cuenta y entra a trabajar con tus propias motos, clientes y órdenes.</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-200"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-300"/>Sin tarjeta</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-300"/>Sin cobros automáticos</span></div>
          <div className="mt-8 hidden lg:block"><TrialBenefits/></div>
        </section>
        <div className="min-w-0">{user ? <section className="rounded-2xl border border-white/15 bg-[#0d1b2e] p-6"><h2 className="text-xl font-bold">Tu cuenta ya está abierta</h2><p className="mt-3 text-sm leading-6 text-slate-300">Continúa con la configuración de tu taller desde tu cuenta.</p><Link href="/no-workshop" className="mt-5 inline-flex rounded-xl bg-orange-400 px-5 py-3 font-bold text-slate-950">Continuar con mi cuenta</Link></section> : phoneEnabled ? <PhoneAccessForm mode="signup"/> : <TrialForm/>}</div>
        <div className="lg:hidden"><TrialBenefits/></div>
      </div>
    </div>
  </main>;
}

function TrialBenefits() {
  return <div className="space-y-5">
    <div className="space-y-4">{[
      { Icon: ClipboardList, title: 'Sabe en qué va cada moto', detail: 'Diagnóstico, repuestos y servicios en una misma orden.' },
      { Icon: MessageCircle, title: 'Tu cliente también puede consultar', detail: 'Comparte el seguimiento de la moto desde su portal.' },
      { Icon: Wallet, title: 'Lleva las cuentas con claridad', detail: 'Organiza inventario, ventas y finanzas de tu taller.' },
    ].map(({Icon,title,detail}) => <div key={title} className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-300/10 bg-blue-400/10 text-blue-300"><Icon size={20}/></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div></div>)}</div>
    <div className="rounded-xl border border-white/10 p-4 text-xs leading-6 text-slate-300"><p className="flex items-center gap-2 font-semibold text-slate-100"><ShieldCheck size={16} className="text-emerald-300"/>¿Qué pasa después de los 15 días?</p><p className="mt-2">Tú decides si continúas con un plan. Si no lo haces, se pausa el acceso operativo; la prueba no genera cobros automáticos. Al contratar conservas la información de tu taller.</p></div>
  </div>;
}

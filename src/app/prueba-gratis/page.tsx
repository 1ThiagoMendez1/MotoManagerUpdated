import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bike, CheckCircle2, ClipboardList, Gift, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';
import { TrialForm } from './TrialForm';

export const metadata: Metadata = {
  title: 'Activa 15 días gratis | MotoManager Full Taller',
  description: 'Activa tu taller en tres pasos y disfruta MotoManager Full por 15 días. Sin tarjeta ni cobros automáticos.',
};

const benefits = [
  { title: 'Cada moto bajo control', detail: 'Órdenes e historial en un solo lugar.', Icon: Bike },
  { title: 'Todo tu taller conectado', detail: 'Clientes, inventario, ventas y agenda.', Icon: ClipboardList },
  { title: 'Tu equipo organizado', detail: 'Técnicos, accesos y permisos Full.', Icon: Users },
];

export default async function TrialPage() {
  const user = await getCurrentUserServer();
  if (user?.workshopId) {
    const workshop = await getWorkshopDetails(user);
    redirect(workshop?.trial_expired ? '/dashboard/subscription' : '/' + (workshop?.slug || 'dashboard'));
  }
  return <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#050b18] px-5 py-7 text-white sm:py-10">
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-44 h-[530px] w-[530px] rounded-full bg-orange-500/10 blur-[125px]" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"><ArrowLeft size={17}/> Volver a MotoManager</Link>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-200">Activación segura</span>
      </header>
      <div className="grid flex-1 items-center gap-8 pb-12 pt-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:py-16">
        <section className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={48} height={48}/>
            <span className="text-xl font-black tracking-tight sm:text-2xl">MotoManager</span>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-xs font-extrabold text-[#ffb97f]"><Gift size={16}/> PRUEBA FULL TALLER · 15 DÍAS POR $0</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.07] tracking-[-.05em] sm:text-5xl lg:text-6xl">
            Tu taller puede crecer. <span className="block text-[#ff831b]">Empieza hoy, gratis.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Olvídate del desorden entre chats y cuadernos. Organiza tus motos, clientes y órdenes en MotoManager Full desde el primer día.
          </p>
          <div className="mt-7">
            {user ? <p className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm">Ya tienes una sesión iniciada. <Link href="/no-workshop" className="font-bold text-orange-300 underline">Revisa tu cuenta</Link> para continuar.</p> : <TrialForm />}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={16} className="text-emerald-300"/> Sin tarjeta, sin permanencia y sin cobros automáticos.</p>
        </section>
        <section aria-label="Qué incluye tu prueba" className="relative rounded-[28px] border border-white/15 bg-[#0d1b2e]/90 p-5 shadow-2xl shadow-black/25 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-extrabold tracking-[.17em] text-[#ffb47d]">PLAN FULL ACTIVADO</p><h2 className="mt-2 text-2xl font-black tracking-tight">Todo tu taller, conectado.</h2></div>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-orange-400/10 text-orange-400"><Wrench size={27}/></span>
          </div>
          <div className="mt-6 space-y-4">
            {benefits.map(({title,detail,Icon})=><article key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Icon size={22}/></span>
              <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div>
              <CheckCircle2 size={18} className="ml-auto shrink-0 text-orange-400"/>
            </article>)}
          </div>
          <div className="mt-6 rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-orange-200"><Sparkles size={18}/> Tu primer paso cuesta $0</p>
            <p className="mt-2 text-xs leading-6 text-slate-300">Al completar los 15 días puedes elegir el plan que más te convenga. Tu información permanece en tu taller.</p>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

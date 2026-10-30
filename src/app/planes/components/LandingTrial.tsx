import Link from 'next/link';
import { ArrowRight, CheckCircle2, Gift } from 'lucide-react';
import { HalloweenTrialOffer } from './HalloweenCampaign';

export function LandingTrial({ fullPrice, halloween = false }: { fullPrice: number; halloween?: boolean }) {
  if (halloween) return <HalloweenTrialOffer fullPrice={fullPrice} />;
  return <section id="prueba-gratis" className="scroll-mt-20 border-y border-[#ff831b]/20 bg-[#0b2036] px-5 py-16 text-white">
    <div className="mx-auto grid max-w-7xl items-center gap-9 lg:grid-cols-[1.2fr_0.8fr]">
      <div><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffad68]"><Gift className="h-4 w-4" />Tu taller merece probarlo completo</span>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">15 días con Full.<br /><span className="text-[#ff831b]">El cambio se entiende usándolo.</span></h2>
        <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">Descubre qué pasa cuando clientes, motos, órdenes, inventario y finanzas trabajan juntos. Con tus datos reales y tu equipo, desde el primer día.</p>
        <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-slate-200">{['Sin tarjeta', 'Sin permanencia', 'Conserva tus datos al contratar'].map(text => <span key={text} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#ffad68]" />{text}</span>)}</div>
      </div>
      <div className="rounded-2xl border border-[#ff831b]/35 bg-[#050b18]/60 p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Activa Full Taller hoy</p><p className="mt-4 text-6xl font-extrabold tracking-tight">$0<span className="ml-2 text-sm font-semibold tracking-normal text-slate-300">por 15 días</span></p>
        <p className="mt-4 text-sm leading-7 text-slate-300">Después, tú eliges. Full desde {fullPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}/mes o cambia a otro plan. No se cobra automáticamente.</p>
        <Link href="/prueba-gratis" className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-4 text-sm font-extrabold text-[#081121] transition hover:bg-[#ffa149]">Quiero mis 15 días gratis <ArrowRight className="h-4 w-4" /></Link>
        <a href="#planes" className="mt-4 block text-center text-xs font-semibold text-slate-300 underline underline-offset-4">Comparar planes para después de mi prueba</a>
      </div>
    </div>
  </section>;
}

'use client';

import { ArrowRight, Bike, Boxes, CheckCircle2, ClipboardList, LayoutGrid, PlayCircle, ShieldCheck, ShoppingBag, Wrench } from 'lucide-react';
import Link from 'next/link';
import { HalloweenHero } from './HalloweenCampaign';

const SMALL_CARDS = [
  { name: 'Clientes', subtitle: 'Directorio y contactos', icon: ShieldCheck, bg: 'bg-emerald-500' },
  { name: 'Motocicletas', subtitle: 'Historial vehicular', icon: Bike, bg: 'bg-[#ff7e13]' },
  { name: 'Inventario', subtitle: 'Repuestos y stock', icon: Boxes, bg: 'bg-amber-500' },
  { name: 'Ventas', subtitle: 'Caja y mostrador', icon: ShoppingBag, bg: 'bg-green-500' },
];

export function LandingHero({ onScrollToPlanes, halloween = false }: { onScrollToPlanes: () => void; halloween?: boolean }) {
  if (halloween) return <HalloweenHero onScrollToPlanes={onScrollToPlanes} />;
  return (
    <section className="relative isolate overflow-hidden bg-[#050b18] px-5 pb-20 pt-16 text-white sm:pt-20 lg:pb-28 lg:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-44 top-0 h-[650px] w-[650px] rounded-full bg-[#347df1]/15 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-[-200px] h-[600px] w-[600px] rounded-full bg-[#ff7e13]/10 blur-[110px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7e13]/30 bg-[#ff7e13]/10 px-4 py-2 text-xs font-bold tracking-wide text-[#ffad68]">
            <span className="h-2 w-2 rounded-full bg-[#ff851f]" />
            15 DÍAS GRATIS · PLAN FULL TALLER
          </div>
          <h1 className="mt-7 text-[clamp(2.8rem,5.2vw,4.95rem)] font-extrabold leading-[1.055] tracking-[-0.06em]">
            Controla cada moto.
            <span className="mt-1 block text-[#ff821a]">Haz crecer tu taller.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
            Deja de buscar información entre cuadernos y chats. Con MotoManager conectas
            órdenes de trabajo, clientes, motocicletas, inventario y ventas en un solo lugar. Pruébalo con tu taller durante 15 días: plan Full, por $0.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/prueba-gratis" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-6 text-sm font-extrabold text-[#0a1425] shadow-[0_14px_40px_rgba(255,125,16,.23)] transition hover:-translate-y-0.5 hover:bg-[#ffa149]">
              Activar mis 15 días gratis <ArrowRight className="h-5 w-5" />
            </Link>
            <button onClick={onScrollToPlanes} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-bold text-white transition hover:bg-white/10">
              Ver planes y precios <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400 sm:text-sm">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#ff962f]" /> Full por 15 días</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#ff962f]" /> Sin tarjeta ni cobros automáticos</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#ff962f]" /> Diseñado para talleres de motos</span>
          </div>
          <a href="#demo" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
            <PlayCircle className="h-4 w-4" /> Ver demo interactiva sin registro
          </a>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[36px] bg-gradient-to-tr from-[#347df1]/20 via-transparent to-[#ff7e13]/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-[#eaf1f8] text-[#142036] shadow-[0_30px_90px_rgba(0,0,0,.48)] sm:rounded-[30px]">
            <div className="flex items-center justify-between border-b border-[#d8e2ed] bg-[#f7f9fc] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#ff7e13]"><Wrench className="h-5 w-5" /></span>
                <div><p className="text-sm font-extrabold tracking-tight">MotoManager</p><p className="text-[10px] text-slate-500">Taller Ejemplo · Vista ilustrativa</p></div>
              </div>
              <span className="rounded-lg bg-[#347df1] px-3 py-2 text-[11px] font-bold text-white">+ Nueva orden</span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mb-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tu centro de operaciones</span>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Tu taller, bajo control.</h2>
                <p className="mt-1 text-xs text-slate-500">Cada módulo conectado al siguiente.</p>
              </div>
              <div className="grid grid-cols-[1.55fr_1fr] gap-3">
                <div className="rounded-2xl border border-[#d3dfec] bg-gradient-to-br from-[#edf4fd] to-[#dbe8fb] p-4 sm:p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#347df1] text-white"><ClipboardList className="h-5 w-5" /></span>
                  <h3 className="mt-3 text-sm font-extrabold sm:text-lg">Órdenes de Trabajo</h3>
                  <p className="mt-2 text-[11px] text-slate-600">Recepción, reparación y entrega.</p>
                  <div className="mt-5 flex gap-2">
                    <span className="rounded-lg bg-[#347df1] px-3 py-2 text-[10px] font-bold text-white sm:px-4">+ Nueva orden</span>
                    <span className="rounded-lg border border-[#c9d5e2] bg-white/70 px-3 py-2 text-[10px] font-semibold">Ver todas</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#d3dfec] bg-[#f7f9fc] p-4 sm:p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white"><LayoutGrid className="h-5 w-5" /></span>
                  <h3 className="mt-3 text-sm font-extrabold sm:text-base">Dashboard</h3>
                  <p className="mt-2 text-[11px] leading-5 text-slate-600">Visión del rendimiento y la operación.</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SMALL_CARDS.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="min-h-[112px] rounded-xl border border-[#d8e2ed] bg-[#f7f9fc] p-3">
                      <span className={'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white ' + item.bg}><Icon className="h-4 w-4" /></span>
                      <p className="mt-3 text-[11px] font-extrabold">{item.name}</p>
                      <p className="mt-1 hidden text-[9px] leading-4 text-slate-500 sm:block">{item.subtitle}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#d6e0ea] pt-3 text-[10px] text-slate-500">
                <span>Inspirado en la interfaz real del producto</span>
                <a href="#demo" className="inline-flex items-center gap-1 font-extrabold text-[#347df1]">Explorar de verdad <ArrowRight className="h-3 w-3" /></a>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 hidden items-center gap-2 rounded-xl border border-white/15 bg-[#12233b] px-4 py-3 text-xs font-semibold text-white shadow-xl sm:flex lg:-left-7">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            No es una imagen: abajo lo puedes usar.
          </div>
        </div>
      </div>
    </section>
  );
}

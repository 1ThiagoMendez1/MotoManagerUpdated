'use client';

import { ArrowRight, Check, ClipboardCheck, Gauge, MessageSquareText, Wrench } from 'lucide-react';

export function LandingHero({ onScrollToPlanes }: { onScrollToPlanes: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[#081121] px-5 pb-24 pt-20 text-white lg:pb-32 lg:pt-28">
      <div className="pointer-events-none absolute -right-32 top-4 h-[540px] w-[540px] rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-52 bottom-0 h-[440px] w-[440px] rounded-full bg-blue-600/10 blur-[110px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.94fr] lg:gap-16">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            Software de gestión para talleres de motos
          </div>
          <h1 className="max-w-[760px] text-5xl font-semibold leading-[1.09] tracking-[-0.055em] sm:text-6xl lg:text-[4.25rem]">
            Tu taller, más organizado.
            <span className="block text-cyan-300">Tu negocio, mejor gestionado.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            Centraliza clientes, motocicletas, órdenes de trabajo, inventario y ventas en un solo lugar.
            Dedica menos tiempo a buscar información y más a atender bien cada servicio.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onScrollToPlanes}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-7 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Conocer planes y precios <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#como-funciona" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/20 px-7 font-semibold text-white transition hover:border-white/40 hover:bg-white/5">
              Descubrir cómo funciona
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">
            {['Accede desde el navegador', 'Información por taller', 'Planes para distintos equipos'].map(label => (
              <span key={label} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative" aria-label="Representación ilustrativa del flujo de órdenes de MotoManager">
          <div className="absolute inset-6 -rotate-3 rounded-[32px] bg-gradient-to-br from-cyan-400/20 to-blue-500/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#111e32] shadow-[0_36px_95px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300 text-slate-950"><Wrench className="h-4 w-4" /></span>
                MotoManager <span className="font-normal text-slate-400">/ Flujo del taller</span>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-400">Ejemplo ilustrativo</span>
            </div>
            <div className="grid gap-5 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-200">Organiza el servicio</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Cada moto, en su etapa.</h2>
                </div>
                <Gauge className="hidden h-10 w-10 text-cyan-200/70 sm:block" />
              </div>
              <div className="grid gap-3">
                {[
                  {number:'01', title:'Recepción', description:'Cliente y motocicleta identificados', state:'Registrada', highlight:false},
                  {number:'02', title:'Diagnóstico', description:'Orden y técnico asignado', state:'En proceso', highlight:true},
                  {number:'03', title:'Reparación', description:'Seguimiento del trabajo', state:'En seguimiento', highlight:false},
                  {number:'04', title:'Entrega', description:'Historial disponible para la próxima visita', state:'Cerrada', highlight:false},
                ].map(item => (
                  <div key={item.number} className={`flex items-center gap-3 rounded-xl border p-3.5 sm:p-4 ${item.highlight ? 'border-cyan-300/40 bg-cyan-300/10' : 'border-white/10 bg-white/[0.035]'}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${item.highlight ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-cyan-200'}`}>{item.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs leading-5 text-slate-400">{item.description}</p>
                    </div>
                    <span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300 sm:block">{item.state}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <ClipboardCheck className="h-6 w-6 text-cyan-300" />
                  <div><p className="text-sm font-semibold">Órdenes</p><p className="text-xs text-slate-400">Seguimiento</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <MessageSquareText className="h-6 w-6 text-cyan-300" />
                  <div><p className="text-sm font-semibold">Avisos</p><p className="text-xs text-slate-400">Según tu plan</p></div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Vista conceptual del proceso; no contiene datos de clientes.</p>
        </div>
      </div>
    </section>
  );
}

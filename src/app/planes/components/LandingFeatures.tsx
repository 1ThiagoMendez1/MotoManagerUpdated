'use client';

import { ArrowUpRight, Boxes, CalendarDays, ClipboardList, CreditCard, MessageCircle, UsersRound } from 'lucide-react';

const ITEMS = [
  {
    icon: ClipboardList, number: '01', title: 'Órdenes de trabajo',
    description: 'Desde el ingreso hasta la entrega: seguimiento de estados, diagnóstico, técnico asignado e historial del servicio.',
    detail: 'Trazabilidad del trabajo',
  },
  {
    icon: UsersRound, number: '02', title: 'Clientes y motocicletas',
    description: 'Identifica cada moto, consulta su propietario y vuelve a encontrar sus servicios anteriores cuando regresa al taller.',
    detail: 'Historial conectado',
  },
  {
    icon: Boxes, number: '03', title: 'Inventario y repuestos',
    description: 'Organiza productos, existencias y movimientos de inventario para tener más claridad al preparar cada trabajo.',
    detail: 'Control de existencias',
  },
  {
    icon: CreditCard, number: '04', title: 'Ventas y caja',
    description: 'Registra ventas de productos y servicios y consulta la información comercial del taller en el mismo sistema.',
    detail: 'Operación comercial',
  },
  {
    icon: CalendarDays, number: '05', title: 'Agenda y equipo',
    description: 'Gestiona citas y organiza el trabajo de tus técnicos con permisos y funciones según el plan contratado.',
    detail: 'Disponible según plan',
  },
  {
    icon: MessageCircle, number: '06', title: 'Avisos por WhatsApp',
    description: 'Comunica avances y estados a tus clientes mediante las notificaciones disponibles y la integración configurada.',
    detail: 'Cuotas según plan',
  },
];

export function LandingFeatures() {
  return (
    <section id="funciones" className="scroll-mt-20 bg-[#f6f8fc] px-5 py-24 text-slate-900 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Una operación conectada</span>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
              Lo que sucede en tu taller, <span className="text-sky-700">en un solo sistema.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-slate-600">
            Tu operación deja de estar repartida entre papeles, hojas de cálculo y mensajes. Todo conectado para atender mejor cada moto.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <article key={item.number} className="group flex min-h-[270px] flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Icon className="h-6 w-6" /></div>
                  <span className="text-xs font-semibold tracking-widest text-slate-400">{item.number}</span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-sky-700">
                  {item.detail}<ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-slate-500">La disponibilidad y los límites de cada módulo dependen del plan. Consulta la comparación antes de contratar.</p>
      </div>
    </section>
  );
}

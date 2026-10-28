'use client';

import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { getPlanLimits } from '@/lib/constants/plans';

const formatCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

type Cycle = 'monthly' | 'biannual' | 'yearly';
const CYCLES: Record<Cycle, { label: string; months: number; factor: number; period: string; saving: string }> = {
  monthly: { label: 'Mensual', months: 1, factor: 1, period: '/ mes', saving: '' },
  biannual: { label: 'Semestral', months: 6, factor: 0.9, period: '/ 6 meses', saving: 'Ahorras 10%' },
  yearly: { label: 'Anual', months: 12, factor: 0.8, period: '/ año', saving: 'Ahorras 20%' },
};

interface Props {
  plans: any[];
  features: any[];
  onSelectPlan: (plan: any) => void;
  onScrollToPlanes: () => void;
  previewMode?: boolean;
}

const limitText = (value: number, single: string, multiple: string) =>
  value < 0 ? `${multiple} sin límite de plan` : `${value} ${value === 1 ? single : multiple}`;

export function LandingPricing({ plans, onSelectPlan, previewMode = false }: Props) {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const config = CYCLES[cycle];
  const sortedPlans = [...plans].filter(p => ['basic', 'pro', 'full'].includes(p.id)).sort((a,b) => a.price - b.price);

  return (
    <section id="planes" className={`scroll-mt-20 bg-[#091426] px-5 text-white ${previewMode ? 'py-12' : 'py-24 lg:py-28'}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Planes claros, para cada etapa</span>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">Invierte en orden. <span className="text-cyan-300">Crece a tu ritmo.</span></h2>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Elige las herramientas y capacidades que necesita tu taller. Los precios base se consultan desde la configuración comercial de MotoManager.
          </p>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Periodicidad de facturación">
          {(Object.keys(CYCLES) as Cycle[]).map(value => (
            <button
              key={value} type="button" onClick={() => setCycle(value)}
              aria-pressed={cycle === value}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${cycle === value ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'}`}
            >
              {CYCLES[value].label}
              {CYCLES[value].saving && <span className={`ml-2 text-xs ${cycle === value ? 'text-slate-700' : 'text-cyan-300'}`}>{CYCLES[value].saving}</span>}
            </button>
          ))}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {sortedPlans.map(plan => {
            const limits = getPlanLimits(plan.id);
            const isPro = plan.id === 'pro';
            const isFull = plan.id === 'full';
            const price = Number(plan.price) || 0;
            const total = Math.round(price * config.months * config.factor);
            const bullets = [
              limitText(limits.users_limit, 'usuario', 'usuarios'),
              limitText(limits.whatsapp_limit, 'aviso de WhatsApp al mes', 'avisos de WhatsApp al mes'),
              limits.clients_limit < 0 ? 'Clientes y motos sin límite de plan' : `Hasta ${limits.clients_limit} clientes y ${limits.motorcycles_limit} motos`,
              'Órdenes de trabajo e historial',
              limits.has_inventory && limits.has_sales ? 'Inventario, ventas y caja' : 'Gestión operativa esencial',
              limits.has_appointments ? 'Citas y agenda' : 'Citas y agenda: desde Pro',
              limits.has_technicians ? 'Gestión de técnicos' : 'Gestión de técnicos: desde Pro',
              limits.has_accounting ? 'Contabilidad y finanzas' : 'Contabilidad: desde Pro',
              isFull ? 'Dashboard y permisos completos' : 'Permisos según tu plan',
            ];
            return (
              <article key={plan.id} className={`relative flex flex-col rounded-[26px] border p-7 sm:p-8 ${isPro ? 'border-cyan-300/70 bg-[#15263a] shadow-[0_20px_70px_rgba(34,211,238,0.11)]' : 'border-white/15 bg-white/[0.045]'}`}>
                {isPro && <span className="absolute -top-3 left-7 rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-950">Equilibrio para crecer</span>}
                <div>
                  <p className="text-sm font-medium text-cyan-200">{isFull ? 'Máxima capacidad' : isPro ? 'Para equipos en crecimiento' : 'Para comenzar organizado'}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{plan.name}</h3>
                  <p className="mt-2 min-h-10 text-sm leading-6 text-slate-400">{plan.description}</p>
                </div>
                <div className="mt-7 border-y border-white/10 py-6">
                  <div className="flex flex-wrap items-end gap-2">
                    <strong className="text-4xl font-semibold tracking-tight sm:text-[2.75rem]">{formatCOP(total)}</strong>
                    <span className="pb-1 text-sm text-slate-400">{config.period}</span>
                  </div>
                  {config.months > 1 ? (
                    <p className="mt-2 text-sm text-cyan-200">
                      Equivale a {formatCOP(Math.round(total / config.months))}/mes · Ahorras {formatCOP(price * config.months - total)}
                    </p>
                  ) : <p className="mt-2 text-sm text-slate-400">Facturación mensual</p>}
                </div>
                <ul className="mt-7 flex-1 space-y-3.5">
                  {bullets.map((value, i) => {
                    const disabled = (i === 5 && !limits.has_appointments) || (i === 6 && !limits.has_technicians) || (i === 7 && !limits.has_accounting);
                    return (
                      <li key={value} className={`flex items-start gap-3 text-sm leading-5 ${disabled ? 'text-slate-500' : 'text-slate-200'}`}>
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${disabled ? 'border border-slate-600' : 'bg-cyan-300/15 text-cyan-300'}`}>
                          {!disabled && <Check className="h-3 w-3" />}
                        </span>
                        {value}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => onSelectPlan({ ...plan, price: total, amountInCents: total * 100, billingCycle: cycle, period: config.period })}
                  className={`mt-9 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition ${isPro ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-white text-slate-900 hover:bg-slate-200'}`}
                >
                  Elegir {plan.name} <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
        <div className="mx-auto mt-9 flex max-w-3xl flex-col items-center gap-2 text-center text-sm text-slate-400">
          <div className="flex items-center gap-2 text-slate-300"><ShieldCheck className="h-4 w-4 text-cyan-300" /> El pago se procesa mediante la integración con Wompi.</div>
          <p>Los descuentos semestral y anual se calculan sobre el precio mensual seleccionado. Los envíos de WhatsApp requieren que la integración esté disponible y configurada.</p>
        </div>
      </div>
    </section>
  );
}

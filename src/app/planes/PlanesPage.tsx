'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, ClipboardList, Handshake, PackageCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { LandingInteractiveDemo } from './components/LandingInteractiveDemo';
import { LandingWhyChange } from './components/LandingWhyChange';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingPricing } from './components/LandingPricing';
import { LandingTestimonialsAndFAQ } from './components/LandingTestimonialsAndFAQ';
import { LandingFooter } from './components/LandingFooter';
import { PaymentModal, RegistrationModal } from './components/LandingModals';

interface Plan {
  id: 'basic' | 'pro' | 'full';
  name: string;
  price: number;
  amountInCents: number;
  period: string;
  gradient: string;
  border: string;
  savings: string | null;
  billingCycle: 'monthly' | 'biannual' | 'yearly';
}

function ProductFlow() {
  const steps = [
    { icon: Handshake, label: '01 · Recepción', title: 'Conoce al cliente y su moto', body: 'Registra la información importante desde el ingreso.' },
    { icon: ClipboardList, label: '02 · Gestión', title: 'Abre y sigue la orden', body: 'Organiza el diagnóstico, el estado y el técnico responsable.' },
    { icon: PackageCheck, label: '03 · Operación', title: 'Controla lo que utilizas', body: 'Consulta inventario, repuestos y ventas desde el taller.' },
    { icon: BadgeCheck, label: '04 · Continuidad', title: 'Conserva el historial', body: 'Cuando la moto regresa, su información ya está registrada.' },
  ];
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white px-5 py-24 text-slate-900 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Del ingreso a la entrega</span>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">Menos información dispersa. <span className="text-sky-700">Más continuidad.</span></h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-slate-600">Un flujo pensado para las tareas que un taller repite todos los días.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.label} className="relative flex flex-col rounded-2xl border border-slate-200 bg-[#f7f9fc] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-sky-700">{step.label}</span>
                  {index < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-slate-300 xl:block" />}
                </div>
                <Icon className="mt-8 h-9 w-9 text-sky-700" />
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function PlanesPage({ plans = [], features = [], user }: { plans?: any[]; features?: any[]; user?: any }) {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const urlPlan = searchParams.get('plan');
  const paymentRef = searchParams.get('ref');
  const urlBillingCycle = searchParams.get('cycle');

  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [regModal, setRegModal] = useState({
    open: false, plan: 'basic', billingCycle: 'monthly',
    name: '', email: '', reference: '',
  });

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co';

  useEffect(() => {
    if (paymentStatus !== 'success') return;
    let saved: Record<string, string> = {};
    try { saved = JSON.parse(localStorage.getItem('mm_prepayment') || '{}'); }
    catch { saved = {}; }
    setRegModal({
      open: true,
      plan: urlPlan || saved.plan || 'basic',
      billingCycle: urlBillingCycle || saved.billingCycle || 'monthly',
      name: saved.name || '',
      email: saved.email || '',
      reference: paymentRef || '',
    });
    localStorage.removeItem('mm_prepayment');
  }, [paymentStatus, urlPlan, urlBillingCycle, paymentRef]);

  const scrollToPlanes = () => document.getElementById('planes')?.scrollIntoView({ behavior:'smooth' });

  return (
    <div className="min-h-screen bg-[#081121] text-white">
      <LandingNavbar user={user} />
      <main>
        <LandingHero onScrollToPlanes={scrollToPlanes} />
        <LandingInteractiveDemo />
        <LandingWhyChange />
        <LandingFeatures />
        <ProductFlow />
        <LandingPricing plans={plans} features={features} onSelectPlan={setActivePlan} onScrollToPlanes={scrollToPlanes} />
        <LandingTestimonialsAndFAQ />
        <section className="bg-[#0b2036] px-5 py-20 text-center text-white">
          <div className="mx-auto max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Tu siguiente paso</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">¿Listo para dejar el desorden atrás?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">Ya viste cómo se conecta el trabajo del taller. Ahora elige un plan para empezar con tus propios clientes, motos y órdenes.</p>
            <button onClick={scrollToPlanes} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#ff831b] px-7 py-4 font-extrabold text-[#0a1425] transition hover:bg-[#ffa149]">
              Explorar planes <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
      <LandingFooter />

      {activePlan && <PaymentModal plan={activePlan} onClose={() => setActivePlan(null)} appUrl={appUrl} />}
      <RegistrationModal
        open={regModal.open}
        plan={regModal.plan}
        billingCycle={regModal.billingCycle}
        name={regModal.name}
        email={regModal.email}
        reference={regModal.reference}
        onClose={() => setRegModal(previous => ({ ...previous, open: false }))}
      />
    </div>
  );
}

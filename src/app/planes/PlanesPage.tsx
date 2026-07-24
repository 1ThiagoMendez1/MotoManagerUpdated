'use client';

import { useEffect, useState } from 'react';
import { Bike, Users, FileText, Warehouse, DollarSign, UserPlus, LayoutDashboard, UserCog } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingPricing } from './components/LandingPricing';
import { LandingTestimonialsAndFAQ } from './components/LandingTestimonialsAndFAQ';
import { LandingFooter } from './components/LandingFooter';
import { LandingTopWorkshops } from './components/LandingTopWorkshops';
import { PaymentModal, RegistrationModal } from './components/LandingModals';
import { UrgencyBar } from './components/UrgencyBar';
import { SalesNotification } from './components/SalesNotification';

// ─── Plan type ────────────────────────────────────────────────────────────────

interface Plan {
  id: 'monthly' | 'biannual' | 'yearly';
  name: string;
  price: number;
  amountInCents: number;
  period: string;
  gradient: string;
  border: string;
  savings: string | null;
}

// ─── Dashboard preview ────────────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <section id="demo" className="py-24 px-4 scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-card/30 border border-border/30 text-muted-foreground text-sm font-medium">
            Vista previa del sistema
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">
            El dashboard que necesita<br />tu taller
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Toda la información de tu negocio en una sola pantalla. Toma decisiones con datos reales.
          </p>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card dark:bg-[#0d1117] overflow-hidden shadow-2xl shadow-black/30 dark:shadow-black/60 max-w-5xl mx-auto">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b border-border/30">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400/50" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/50" />
              <span className="h-3 w-3 rounded-full bg-green-400/50" />
            </div>
            <div className="flex-1 mx-4 bg-muted/50 rounded-lg px-3 py-1 text-xs text-foreground/30 text-center font-mono">
              motomanager.com.co/mi-taller/dashboard
            </div>
          </div>

          {/* Main content - Real Dashboard Layout */}
          <div className="p-8 md:p-12 relative overflow-hidden">
            {/* Background glow effects simulating the real dashboard */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center mb-10">
              <h1 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight font-space">Bienvenido a MotoManager</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">Selecciona una opción para comenzar a gestionar tu taller.</p>
            </div>
            
            <div className="relative z-10 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 w-full max-w-6xl mx-auto">
              {[
                { icon: LayoutDashboard, label: "Dashboard", description: "Resumen de finanzas y taller" },
                { icon: Bike, label: "Motocicletas", description: "Gestiona los vehículos" },
                { icon: UserPlus, label: "Clientes", description: "Administra tus clientes" },
                { icon: FileText, label: "Órdenes de Trabajo", description: "Administra las reparaciones" },
                { icon: Warehouse, label: "Inventario", description: "Controla tus repuestos" },
                { icon: Users, label: "Técnicos", description: "Administra tu equipo" },
                { icon: DollarSign, label: "Ventas", description: "Revisa las transacciones" },
                { icon: UserCog, label: "Usuarios y Permisos", description: "Controla accesos al sistema" },
              ].map(({ icon: Icon, label, description }) => (
                <div key={label} className="group relative h-full">
                  <div className="relative h-full rounded-xl p-6 flex flex-col items-center text-center bg-card/60 shadow-[0px_-16px_24px_rgba(255,255,255,0.02)_inset] overflow-hidden border border-border/40 group-hover:border-primary/50 transition-all duration-300 backdrop-blur-md group-hover:-translate-y-1">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(47,128,237,0.5)]">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{label}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanesPage({ plans, features, user }: { plans?: any[], features?: any[], user?: any }) {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const urlPlan = searchParams.get('plan');
  const paymentRef = searchParams.get('ref');

  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [regModal, setRegModal] = useState({
    open: false,
    plan: 'biannual',
    name: '',
    email: '',
    reference: '',
  });

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://www.motomanager.com.co';

  // Detect payment success
  useEffect(() => {
    if (paymentStatus === 'success') {
      const saved = JSON.parse(localStorage.getItem('mm_prepayment') || '{}');
      setRegModal({
        open: true,
        plan: urlPlan || saved.plan || 'monthly',
        name: saved.name || '',
        email: saved.email || '',
        reference: paymentRef || '',
      });
      localStorage.removeItem('mm_prepayment');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToPlanes = () => {
    document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Barra de urgencia fija en la parte superior */}
      <div className="sticky top-0 z-[100]">
        <UrgencyBar onScrollToPlanes={scrollToPlanes} />
      </div>

      {/* Notificaciones de ventas para prueba social */}
      <SalesNotification />

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Navbar */}
      <LandingNavbar user={user} />



      {/* Sections */}
      <div className="relative z-10">
        <LandingHero onScrollToPlanes={scrollToPlanes} />
        <LandingFeatures />
        <DashboardPreview />
        <LandingTopWorkshops />
        <LandingPricing 
          plans={plans || []} 
          features={features || []} 
          onSelectPlan={setActivePlan} 
          onScrollToPlanes={scrollToPlanes} 
        />
        <LandingTestimonialsAndFAQ />
        <LandingFooter />
      </div>

      {/* Payment modal (pre-payment) */}
      {activePlan && (
        <PaymentModal
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          appUrl={appUrl}
        />
      )}

      {/* Registration modal (post-payment) */}
      <RegistrationModal
        open={regModal.open}
        plan={regModal.plan}
        name={regModal.name}
        email={regModal.email}
        reference={regModal.reference}
        onClose={() => setRegModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

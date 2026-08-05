'use client';

import { useEffect, useState } from 'react';
import { Bike, Users, FileText, Warehouse, DollarSign, UserPlus, LayoutDashboard, UserCog, Calendar, LifeBuoy, PlusCircle, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingPricing } from './components/LandingPricing';
import { LandingTestimonialsAndFAQ } from './components/LandingTestimonialsAndFAQ';
import { LandingFooter } from './components/LandingFooter';
import { LandingTopWorkshops } from './components/LandingTopWorkshops';
import { PaymentModal, RegistrationModal } from './components/LandingModals';
import { SalesNotification } from './components/SalesNotification';

// ─── Plan type ────────────────────────────────────────────────────────────────

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

          {/* Main content - Real Dashboard Layout (Updated Design) */}
          <div className="p-8 md:p-12 relative overflow-hidden bg-background">
            {/* Background glow effects simulating the real dashboard */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
            <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0 mix-blend-screen" />

            <div className="relative z-10 w-full max-w-6xl mx-auto">
              
              {/* Header / Apertura Personalizada */}
              <div className="mb-4 lg:mb-6 mt-1 text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1 text-foreground">
                  Buenas tardes, Juan.
                </h1>
                <p className="text-sm sm:text-base text-foreground/70 flex items-center gap-2">
                  <span>Tu taller <span className="font-medium text-foreground">repuestos-motos</span>, bajo control.</span>
                </p>
              </div>

              {/* Bento Grid 12 Columnas */}
              <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-3 lg:gap-4">
                
                {/* 1. Centro de Operaciones - Órdenes de Trabajo */}
                <div className="flex flex-col h-full group md:col-span-8 lg:col-span-8">
                  <div className="relative h-full min-h-[180px] sm:min-h-[200px] flex flex-col justify-between p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden text-left">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-2xl bg-blue-500 text-white shadow-md">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Órdenes de Trabajo</h2>
                      </div>
                      <p className="text-muted-foreground max-w-md text-xs sm:text-sm mb-5 font-medium line-clamp-2">
                        El corazón de tu taller. Gestiona reparaciones activas y entregas.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                        <div className="flex-1">
                          <button className="w-full py-3.5 px-6 rounded-2xl bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg">
                            <PlusCircle className="w-5 h-5" />
                            Nueva Orden
                          </button>
                        </div>
                        <div className="flex-1">
                          <button className="w-full py-3.5 px-6 rounded-2xl bg-foreground/5 text-foreground font-medium border border-foreground/10 flex items-center justify-center gap-2">
                            Ver todas
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Resumen General / Dashboard */}
                <div className="md:col-span-8 lg:col-span-4 h-full">
                  <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden flex flex-col text-left">
                    <div className="p-2 rounded-2xl text-white w-fit mb-3 shadow-sm bg-indigo-500">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">Dashboard</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">Visión global de finanzas y rendimiento.</p>
                  </div>
                </div>

                {/* 3. Bloque Operativo Relacionado: Secundarios */}
                <div className="md:col-span-8 lg:col-span-12 grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {[
                    { icon: UserPlus, label: "Clientes", description: "Directorio y contactos.", bg: "bg-emerald-500" },
                    { icon: Bike, label: "Motocicletas", description: "Historial vehicular.", bg: "bg-orange-500" },
                    { icon: Warehouse, label: "Inventario", description: "Control de repuestos y stock.", bg: "bg-amber-500" },
                    { icon: DollarSign, label: "Ventas", description: "Punto de venta y caja.", bg: "bg-green-500" },
                    { icon: Calendar, label: "Citas", description: "Gestión y programación de citas.", bg: "bg-blue-500" },
                  ].map(({ icon: Icon, label, description, bg }) => (
                    <div key={label} className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg flex flex-col text-left">
                      <div className={`p-2 rounded-2xl text-white w-fit mb-3 shadow-sm ${bg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">{label}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">{description}</p>
                    </div>
                  ))}
                </div>

                {/* 4. Administración y Equipo */}
                <div className="md:col-span-8 lg:col-span-12 grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3">
                  {[
                    { icon: Users, label: "Técnicos", description: "Rendimiento del equipo.", bg: "bg-cyan-500" },
                    { icon: UserCog, label: "Permisos", description: "Accesos al sistema.", bg: "bg-purple-500" },
                    { icon: LifeBuoy, label: "Soporte", description: "Centro de ayuda y tickets.", bg: "bg-rose-500" },
                  ].map(({ icon: Icon, label, description, bg }) => (
                    <div key={label} className="relative h-full p-4 sm:p-5 rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[40px] border border-foreground/[0.08] dark:border-white/[0.1] text-left">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-2 rounded-xl text-white shadow-sm shrink-0 ${bg}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-foreground truncate">{label}</h3>
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
              </div>
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
  const urlBillingCycle = searchParams.get('cycle');

  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [regModal, setRegModal] = useState({
    open: false,
    plan: 'basic',
    billingCycle: 'monthly',
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
        plan: urlPlan || saved.plan || 'basic',
        billingCycle: urlBillingCycle || saved.billingCycle || 'monthly',
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
        billingCycle={regModal.billingCycle}
        name={regModal.name}
        email={regModal.email}
        reference={regModal.reference}
        onClose={() => setRegModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

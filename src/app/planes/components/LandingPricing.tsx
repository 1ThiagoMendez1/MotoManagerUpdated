'use client';
import { CheckCircle2, CreditCard, Zap, Lock, Shield, ArrowRight, Phone, Gift, Star } from 'lucide-react';

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

interface Props {
  plans: any[];
  features: any[];
  onSelectPlan: (plan: any) => void;
  onScrollToPlanes: () => void;
}

export function LandingPricing({ plans, features, onSelectPlan, onScrollToPlanes }: Props) {
  // Sort plans by months
  const sortedPlans = [...plans].sort((a, b) => a.months - b.months);
  // Sort features by order_index
  const sortedFeatures = [...features].sort((a, b) => a.order_index - b.order_index);

  return (
    <section id="planes" className="py-24 px-4 scroll-mt-20 relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />
      
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold uppercase tracking-widest animate-pulse">
            <Zap className="h-4 w-4" />
            Oferta Especial Activa
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
            Un precio. <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Todo incluido.</span>
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">
            Deja de pagar extra por módulos adicionales. Con MotoManager tienes <strong className="text-foreground">acceso total</strong> desde el primer día.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {sortedPlans.map(plan => {
            const isAnnual = plan.id === 'yearly';
            const isMonthly = plan.id === 'monthly';
            const pricePerMonth = plan.months > 0 ? plan.price / plan.months : plan.price;
            
            // Decoy calculation (making annual look super cheap compared to monthly x 12)
            const monthlyPlan = sortedPlans.find(p => p.id === 'monthly');
            const monthlyPrice = monthlyPlan ? monthlyPlan.price : 20000; // fallback
            const normalAnnualPrice = monthlyPrice * plan.months; 

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col gap-6 rounded-3xl transition-all duration-300 ${
                  isAnnual 
                    ? 'bg-gradient-to-b from-gray-900 to-black border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] scale-105 z-10 p-8' 
                    : 'bg-card/50 border border-border/50 p-7 hover:border-primary/30 hover:bg-card z-0'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black text-white whitespace-nowrap shadow-lg flex items-center gap-1 ${
                      isAnnual ? 'bg-gradient-to-r from-red-600 to-orange-500 ring-4 ring-background animate-bounce' : 'bg-gradient-to-r from-blue-600 to-blue-500'
                    }`}>
                      {isAnnual && <Star className="w-3 h-3 fill-white" />}
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-2 text-center">
                  <h3 className={`text-2xl font-black ${isAnnual ? 'text-white' : 'text-foreground'}`}>{plan.name}</h3>
                  <p className={`text-sm font-medium ${isAnnual ? 'text-gray-400' : 'text-muted-foreground'}`}>{plan.description}</p>
                </div>

                <div className="text-center py-4 border-y border-white/10">
                  {/* Price Anchoring for Annual */}
                  {isAnnual && (
                     <div className="flex justify-center items-center gap-2 mb-1 opacity-70">
                        <span className="text-sm font-bold text-red-400 line-through">
                          {formatCOP(normalAnnualPrice)}
                        </span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                          Ahorras {formatCOP(normalAnnualPrice - plan.price)}
                        </span>
                     </div>
                  )}

                  <div className="flex justify-center items-end gap-1">
                    <span className={`text-5xl font-black tracking-tighter ${isAnnual ? 'text-white' : 'text-foreground'}`}>
                      {formatCOP(plan.price)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 font-bold ${plan.accent_text}`}>{plan.period}</p>
                  
                  {plan.months > 1 && (
                    <p className={`text-sm mt-2 font-semibold ${isAnnual ? 'text-green-400' : 'text-muted-foreground'}`}>
                      Equivale a solo {formatCOP(Math.round(pricePerMonth))}/mes
                    </p>
                  )}
                </div>

                {isAnnual && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-3 items-start">
                    <Gift className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200 leading-tight">
                      <strong>BONO HOY:</strong> Soporte prioritario VIP por WhatsApp y migración de base de datos inicial GRATIS.
                    </p>
                  </div>
                )}

                <ul className="space-y-3 flex-1 mt-4">
                  {sortedFeatures.filter(f => f[`included_in_${plan.id}`]).map((f, i) => (
                    <li key={f.id} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className={`h-5 w-5 shrink-0 ${isAnnual ? 'text-red-500' : 'text-green-500'}`} />
                      <span className={`font-medium ${isAnnual ? 'text-gray-300' : 'text-foreground/80'}`}>{f.feature_name}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectPlan(plan)}
                  className={`w-full flex items-center justify-center gap-2 font-extrabold h-14 rounded-xl shadow-lg transition-all hover:scale-105 text-base mt-4 ${
                    isAnnual 
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-500/25' 
                      : `bg-gradient-to-r ${plan.btn} text-primary-foreground`
                  }`}
                >
                  {isAnnual ? 'APROVECHAR OFERTA' : `Elegir ${plan.name}`}
                  <ArrowRight className="h-5 w-5" />
                </button>
                
                {isAnnual && (
                  <p className="text-[10px] text-center text-gray-500 mt-2">
                    Precio promocional válido únicamente por hoy.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Guarantees & Trust */}
        <div className="bg-card/40 border border-border/50 rounded-3xl p-8 md:p-12 max-w-5xl mx-auto">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                 <div className="mx-auto w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6" />
                 </div>
                 <h4 className="font-bold text-foreground text-lg mb-2">Pago 100% Seguro</h4>
                 <p className="text-sm text-muted-foreground">Transacciones protegidas y procesadas por Wompi Bancolombia.</p>
              </div>
              <div>
                 <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6" />
                 </div>
                 <h4 className="font-bold text-foreground text-lg mb-2">Activación Inmediata</h4>
                 <p className="text-sm text-muted-foreground">Tendrás acceso a tu sistema en segundos después del pago.</p>
              </div>
              <div>
                 <div className="mx-auto w-12 h-12 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6" />
                 </div>
                 <h4 className="font-bold text-foreground text-lg mb-2">Sin Contratos</h4>
                 <p className="text-sm text-muted-foreground">Eres libre. Cancela o cambia de plan en cualquier momento.</p>
              </div>
           </div>
        </div>

        {/* Final CTA */}
        <div className="relative rounded-3xl bg-gradient-to-br from-red-600 via-orange-600 to-red-700 border border-red-500/50 p-10 md:p-16 text-center space-y-6 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 blur-3xl rounded-full pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-black text-white relative z-10">
            ¿Vas a dejar que tu competencia te gane?
          </h2>
          <p className="text-red-100 max-w-2xl mx-auto leading-relaxed text-lg font-medium relative z-10">
            Cada día que pasas sin MotoManager, estás perdiendo ventas y desorganizando tu inventario.
            Da el paso hacia la modernización hoy mismo.
          </p>
          <div className="flex flex-wrap gap-4 justify-center relative z-10 pt-4">
            <button
              onClick={onScrollToPlanes}
              className="group flex items-center gap-2 bg-white text-red-600 hover:bg-gray-100 font-black px-10 py-5 rounded-2xl shadow-2xl transition-all hover:scale-105 text-lg"
            >
              QUIERO ORGANIZAR MI TALLER <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

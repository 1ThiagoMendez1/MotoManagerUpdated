'use client';
import { CheckCircle2, CreditCard, Zap, Lock, Shield, ArrowRight, Phone } from 'lucide-react';

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
    <section id="planes" className="py-24 px-4 scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-card/30 border border-border/30 text-muted-foreground text-sm font-medium">
            Planes y precios
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">
            Sin letras pequeñas ni costos ocultos
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Todos los planes incluyen exactamente las mismas funcionalidades.
            Solo elige la duración que más te convenga.
          </p>
        </div>

        {/* How it works — 3 steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: '01', title: 'Elige tu plan', desc: 'Selecciona la suscripción que mejor se adapte a tu taller.', Icon: CreditCard, color: 'blue' },
            { step: '02', title: 'Paga de forma segura', desc: 'Nequi, Daviplata, PSE o tarjeta — el método que prefieras.', Icon: Shield, color: 'green' },
            { step: '03', title: 'Activa y empieza', desc: 'Registra tu taller y empieza a gestionar hoy mismo.', Icon: Zap, color: 'amber' },
          ].map(s => {
            const colors: Record<string, string> = {
              blue: 'bg-primary/20 text-primary border-primary/30',
              green: 'bg-green-500/20 text-green-400 border-green-500/30',
              amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            };
            return (
              <div key={s.step} className={`flex items-start gap-4 p-5 rounded-2xl bg-card/30 border ${colors[s.color].split(' ')[2]}`}>
                <div className={`p-2.5 rounded-xl ${colors[s.color].split(' ').slice(0,2).join(' ')} shrink-0`}>
                  <s.Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground/70 text-xs font-mono mb-0.5">Paso {s.step}</p>
                  <h3 className="font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sortedPlans.map(plan => (
            <div
              key={plan.id}
              className={`relative flex flex-col gap-6 rounded-2xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 transition-all hover:scale-[1.02] hover:shadow-2xl ${plan.badge === 'MÁS POPULAR' ? 'ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-foreground whitespace-nowrap bg-gradient-to-r ${plan.id === 'biannual' ? 'from-amber-500 to-orange-500' : plan.id === 'yearly' ? 'from-purple-600 to-purple-500' : 'from-blue-600 to-blue-500'}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                {plan.savings && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium">
                    ✓ {plan.savings}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">{formatCOP(plan.price)}</span>
                </div>
                <p className={`text-sm mt-0.5 ${plan.accent_text}`}>{plan.period}</p>
                {plan.months > 1 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {formatCOP(Math.round(plan.price / plan.months))}/mes
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {sortedFeatures.filter(f => f[`included_in_${plan.id}`]).map(f => (
                  <li key={f.id} className="flex items-center gap-2 text-sm text-foreground/75">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    {f.feature_name}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelectPlan(plan)}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${plan.btn} text-foreground font-semibold h-12 rounded-xl shadow-lg transition-all hover:scale-105 text-sm`}
              >
                <CreditCard className="h-4 w-4" />
                Contratar {plan.name}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground/70 text-sm">
          Todos los planes incluyen las mismas funcionalidades · Sin costos ocultos · Cancela cuando quieras
        </p>

        {/* Comparison table */}
        <div className="max-w-3xl mx-auto rounded-2xl bg-card/30 border border-border/30 overflow-hidden">
          <div className="p-5 border-b border-border/30">
            <h3 className="text-lg font-semibold text-foreground">Comparativa detallada</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-4 text-muted-foreground font-medium">Funcionalidad</th>
                  {sortedPlans.map(plan => (
                     <th key={plan.id} className={`text-center p-4 font-semibold ${plan.accent_text}`}>{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFeatures.map((f, i) => (
                  <tr key={f.id} className={`border-b border-border/20 ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                    <td className="p-4 text-muted-foreground">{f.feature_name}</td>
                    {sortedPlans.map(plan => (
                      <td key={plan.id} className="p-4 text-center">
                        {f[`included_in_${plan.id}`] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-muted/30">
                  <td className="p-4 text-muted-foreground font-semibold">Precio total</td>
                  {sortedPlans.map(plan => (
                    <td key={plan.id} className={`p-4 text-center font-bold ${plan.id === 'monthly' ? 'text-foreground' : plan.accent_text}`}>
                      ${plan.price.toLocaleString('es-CO')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment methods */}
        <div className="text-center space-y-5">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Métodos de pago aceptados</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Tarjeta crédito', icon: '💳' },
              { name: 'Tarjeta débito', icon: '💳' },
              { name: 'Nequi', icon: '📱' },
              { name: 'Daviplata', icon: '📱' },
              { name: 'PSE', icon: '🏦' },
              { name: 'Efectivo', icon: '💵' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card/30 border border-border/30 text-sm text-muted-foreground">
                <span>{m.icon}</span> {m.name}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 text-muted-foreground/70 text-xs">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Conexión cifrada SSL</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Datos protegidos</span>
            <span>·</span>
            <span>Powered by Wompi</span>
          </div>
        </div>

        {/* Final CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/25 via-primary/15 to-secondary/15 border border-primary/25 p-10 md:p-16 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">¿Listo para modernizar tu taller?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Únete a más de 500 talleres que ya gestionan su negocio con MotoManager.
            Empieza hoy desde solo $18.900 al mes. Sin compromisos.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onScrollToPlanes}
              className="group flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 text-base"
            >
              Elegir mi plan <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://wa.me/573001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-border/50 hover:border-border text-muted-foreground hover:text-foreground px-8 py-4 rounded-2xl transition-all hover:bg-accent/20 text-base"
            >
              <Phone className="h-4 w-4" />
              Hablar con soporte
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

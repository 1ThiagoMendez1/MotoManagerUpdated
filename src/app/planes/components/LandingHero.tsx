'use client';
import { ArrowRight, Phone, Shield, Star, Zap } from 'lucide-react';

interface Props {
  onScrollToPlanes: () => void;
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function LandingHero({ onScrollToPlanes }: Props) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden pt-16">
      {/* Animated glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-medium backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5" />
          El CRM #1 para talleres de motos en Colombia
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight tracking-tight">
          Gestiona tu taller<br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
            como un profesional
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Clientes, inventario, órdenes de trabajo, ventas y pagos digitales —
          todo en un solo lugar. Diseñado exclusivamente para talleres de
          motocicletas en Colombia.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={onScrollToPlanes}
            className="group flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/50 text-base"
          >
            Ver planes y precios
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {['CR', 'LT', 'AM', 'JP', 'MV'].map(i => (
                <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[9px] font-bold text-primary-foreground border-2 border-background">
                  {i}
                </div>
              ))}
            </div>
            <span>+500 talleres activos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StarRating count={5} />
            <span>4.9 / 5 satisfacción</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-green-400" />
            <span>Pagos seguros con Wompi</span>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mx-auto max-w-4xl mt-8">
          <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/60">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-card/30 border-b border-border/30">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400/60" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
                <span className="h-3 w-3 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 mx-4 bg-card/30 rounded-lg px-3 py-1 text-xs text-foreground/30 text-center">
                motomanager.com.co/dashboard
              </div>
            </div>
            {/* Dashboard content simulation */}
            <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Clientes', value: '284', color: 'blue', change: '+12%' },
                { label: 'Órdenes activas', value: '47', color: 'amber', change: '+5%' },
                { label: 'Ventas del mes', value: '$4.2M', color: 'green', change: '+23%' },
                { label: 'Stock bajo', value: '3 items', color: 'red', change: 'Alertas' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl bg-card/30 border border-border/30 p-3 md:p-4">
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
                  <span className={`text-xs ${stat.color === 'red' ? 'text-red-400' : 'text-green-400'}`}>{stat.change}</span>
                </div>
              ))}
            </div>
            {/* Fake chart */}
            <div className="mx-4 md:mx-6 mb-4 md:mb-6 rounded-xl bg-card/30 border border-border/30 p-4">
              <p className="text-xs text-muted-foreground mb-3">Ventas últimos 6 meses</p>
              <div className="flex items-end gap-2 h-20">
                {[40, 65, 55, 80, 70, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-primary to-primary/60 opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground/60">
                {['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'].map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

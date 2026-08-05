'use client';
import { ArrowRight, Phone, Shield, Star, Zap, Clock, TrendingUp } from 'lucide-react';

interface Props {
  onScrollToPlanes: () => void;
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function LandingHero({ onScrollToPlanes }: Props) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden pt-32">
      {/* Animated glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Badge - Urgent */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-bounce">
          <Clock className="h-4 w-4" />
          OFERTA POR TIEMPO LIMITADO: 50% OFF EN PLAN ANUAL
        </div>

        {/* Headline - Agitating the pain */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight tracking-tight">
          ¿Pierdes dinero por no tener<br />
          <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            control de tu taller?
          </span>
        </h1>

        {/* Subtitle - The solution */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
          Evita el robo hormiga, organiza tus órdenes y <span className="text-foreground font-bold border-b-2 border-red-500">multiplica tus ganancias</span>. 
          MotoManager es el software #1 diseñado para talleres de motos en Colombia.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
          <button
            onClick={onScrollToPlanes}
            className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold px-10 py-5 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] text-lg w-full sm:w-auto overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            RECLAMAR MI 50% OFF
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="https://wa.me/573001234567"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border-2 border-border/50 hover:border-foreground text-foreground px-8 py-5 rounded-2xl transition-all hover:bg-accent/20 text-lg font-bold w-full sm:w-auto"
          >
            <Phone className="h-5 w-5" />
            Hablar con un asesor
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-medium">
          ⚡ Sin tarjeta de crédito requerida para iniciar · Cancela cuando quieras
        </p>

        {/* Social proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 text-muted-foreground text-sm">
          <div className="flex items-center gap-2 bg-card/40 px-4 py-2 rounded-full border border-border/30">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="font-semibold text-foreground">+500 talleres</span> aumentaron sus ventas
          </div>
          <div className="flex items-center gap-2 bg-card/40 px-4 py-2 rounded-full border border-border/30">
            <StarRating count={5} />
            <span className="font-semibold text-foreground">4.9/5</span> de satisfacción
          </div>
          <div className="flex items-center gap-2 bg-card/40 px-4 py-2 rounded-full border border-border/30">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-foreground">100% Seguro</span> con Wompi
          </div>
        </div>

        {/* Dashboard mockup (Keep the same cool UI) */}
        <div className="relative mx-auto max-w-4xl mt-12 z-0">
          <div className="rounded-2xl border-2 border-primary/20 bg-card/70 backdrop-blur-md overflow-hidden shadow-2xl shadow-black/40 dark:shadow-black/80 ring-1 ring-white/10 transform perspective-1000 rotate-x-2 hover:rotate-x-0 transition-transform duration-500">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 mx-4 bg-black/30 rounded-lg px-3 py-1 text-xs text-white/40 text-center font-mono">
                app.motomanager.com.co/dashboard
              </div>
            </div>
            {/* Dashboard content simulation */}
            <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Clientes Registrados', value: '1,284', color: 'blue', change: '+12% este mes' },
                { label: 'Órdenes Activas', value: '47', color: 'amber', change: '5 críticas' },
                { label: 'Ingresos Mensuales', value: '$14.2M', color: 'green', change: '+23% vs mes anterior' },
                { label: 'Alertas de Stock', value: '3 repuestos', color: 'red', change: 'Pedir urgente' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl bg-black/20 border border-white/5 p-4 relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br transition-opacity duration-300 ${
                    stat.color === 'red' ? 'from-red-500' : 
                    stat.color === 'green' ? 'from-green-500' : 
                    stat.color === 'amber' ? 'from-amber-500' : 'from-blue-500'
                  }`} />
                  <p className="text-xs text-muted-foreground mb-1 font-medium">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</p>
                  <span className={`text-xs font-bold mt-1 inline-block ${stat.color === 'red' ? 'text-red-400' : stat.color === 'green' ? 'text-green-400' : stat.color === 'amber' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {stat.change}
                  </span>
                </div>
              ))}
            </div>
            {/* Fake chart */}
            <div className="mx-6 mb-6 rounded-xl bg-black/20 border border-white/5 p-5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <p className="text-sm font-bold text-muted-foreground mb-4">Crecimiento de Ventas (Últimos 6 meses)</p>
              <div className="flex items-end gap-3 h-28">
                {[40, 55, 45, 75, 65, 95].map((h, i) => (
                  <div key={i} className="flex-1 relative group">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded font-bold">
                      +{h}%
                    </div>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-primary/20 to-primary opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:to-red-500" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-xs font-bold text-muted-foreground/60">
                {['Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr'].map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-primary/30 blur-[60px] rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

'use client';
import {
  Users, Package, ClipboardList, BarChart3,
  MessageSquare, CreditCard, Download, Shield,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const FEATURES = [
  {
    icon: Users,
    title: 'Clientes y Motos',
    color: 'blue',
    description: 'Registra clientes con historial completo de sus motocicletas, servicios anteriores y reparaciones. Búsqueda instantánea por nombre, placa o cédula.',
    details: ['Fichas de clientes con fotos', 'Historial de visitas y servicios', 'Programa de clientes frecuentes', 'Búsqueda por placa o nombre'],
  },
  {
    icon: ClipboardList,
    title: 'Órdenes de Trabajo',
    color: 'amber',
    description: 'Crea, asigna y rastrea órdenes de trabajo en tiempo real. Asigna técnicos, define diagnósticos y controla el estado de cada reparación.',
    details: ['Estados: diagnóstico, reparando, entregado', 'Asignación de técnicos', 'Tiempo estimado y real', 'Historial completo por moto'],
  },
  {
    icon: Package,
    title: 'Control de Inventario',
    color: 'green',
    description: 'Administra repuestos, accesorios y herramientas con alertas de stock mínimo, control de entradas y salidas, y trazabilidad completa.',
    details: ['Alertas de stock mínimo', 'Múltiples categorías', 'Control de proveedores', 'Exportación a Excel'],
  },
  {
    icon: BarChart3,
    title: 'Ventas y Facturación',
    color: 'purple',
    description: 'Registra ventas directas y de servicio. Genera recibos profesionales para tus clientes al instante. Reportes de ingresos por período.',
    details: ['Recibos de pago digitales', 'Historial de transacciones', 'Filtros por fecha y método', 'Resumen mensual de ventas'],
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Automático',
    color: 'emerald',
    description: 'Envía notificaciones automáticas a clientes cuando su moto esté lista o cambie de estado. Sin escribir nada manualmente.',
    details: ['Notificación al cliente automática', 'Plantillas personalizables', 'Historial de mensajes enviados', 'Integración con WhatsApp Business'],
  },
  {
    icon: Download,
    title: 'Reportes Exportables',
    color: 'cyan',
    description: 'Exporta reportes de ventas, gastos e inventario a Excel con un solo clic para tu contabilidad y análisis de negocio.',
    details: ['Exportación a Excel (.xlsx)', 'Reportes de ventas por período', 'Informe de inventario valorado', 'Estadísticas de técnicos'],
  },
  {
    icon: CreditCard,
    title: 'Pagos Digitales',
    color: 'pink',
    description: 'Cobra a tus clientes de forma digital con Wompi: tarjeta de crédito, Nequi, Daviplata, PSE y efectivo en corresponsales.',
    details: ['Wompi integrado nativamente', 'Nequi y Daviplata', 'PSE y transferencia', 'Registro automático en ventas'],
  },
  {
    icon: Shield,
    title: 'Multi-técnico y Roles',
    color: 'orange',
    description: 'Agrega todo tu equipo con permisos diferenciados. Cada técnico ve solo lo que necesita. El propietario tiene visibilidad total.',
    details: ['Roles: propietario y técnico', 'Técnicos ilimitados', 'Control de acceso por módulo', 'Registro de actividad'],
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; dot: string }> = {
  blue:    { bg: 'bg-blue-500/15',    icon: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  amber:   { bg: 'bg-amber-500/15',   icon: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  green:   { bg: 'bg-green-500/15',   icon: 'text-green-400',   border: 'border-green-500/30',   dot: 'bg-green-400' },
  purple:  { bg: 'bg-purple-500/15',  icon: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-400' },
  emerald: { bg: 'bg-emerald-500/15', icon: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  cyan:    { bg: 'bg-cyan-500/15',    icon: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400' },
  pink:    { bg: 'bg-pink-500/15',    icon: 'text-pink-400',    border: 'border-pink-500/30',    dot: 'bg-pink-400' },
  orange:  { bg: 'bg-orange-500/15',  icon: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400' },
};

export function LandingFeatures() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];
  const c = COLOR_MAP[feat.color];

  return (
    <section id="funciones" className="py-24 px-4 scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-14">
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-card/30 border border-border/30 text-muted-foreground text-sm font-medium">
            Funcionalidades
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Todo lo que tu taller necesita
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Herramientas diseñadas por mecánicos, para mecánicos. Sin complicaciones.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: '+500', l: 'Talleres registrados' },
            { v: '+50K', l: 'Órdenes procesadas' },
            { v: '+200K', l: 'Clientes gestionados' },
            { v: '4.9★', l: 'Calificación promedio' },
          ].map(s => (
            <div key={s.l} className="rounded-2xl bg-card/30 border border-border/30 p-5 text-center hover:bg-card/40 transition-colors">
              <p className="text-3xl font-extrabold text-foreground">{s.v}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Interactive features panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: feature list */}
          <div className="space-y-2">
            {FEATURES.map((f, i) => {
              const col = COLOR_MAP[f.color];
              const Icon = f.icon;
              return (
                <button
                  key={f.title}
                  onClick={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    active === i
                      ? `${col.bg} border ${col.border} text-foreground`
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/30 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${active === i ? col.bg : 'bg-card/30'} shrink-0`}>
                    <Icon className={`h-4 w-4 ${active === i ? col.icon : 'text-muted-foreground'}`} />
                  </div>
                  <span className="font-medium text-sm">{f.title}</span>
                  {active === i && <ChevronRight className={`h-4 w-4 ml-auto ${col.icon}`} />}
                </button>
              );
            })}
          </div>

          {/* Right: detail panel */}
          <div className={`lg:col-span-2 rounded-2xl border ${c.border} ${c.bg} p-8 flex flex-col gap-6 transition-all`}>
            <div className={`p-3 rounded-xl ${c.bg} w-fit`}>
              <feat.icon className={`h-7 w-7 ${c.icon}`} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-3">{feat.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feat.description}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {feat.details.map(d => (
                <li key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
                  {d}
                </li>
              ))}
            </ul>
            {/* Mini mockup */}
            <div className="mt-auto rounded-xl bg-muted/30 border border-border/30 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${c.dot}`} />
                <span className="text-xs text-muted-foreground/60">Vista previa — módulo {feat.title}</span>
              </div>
              {[1,2,3].map(row => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-card/50 shrink-0" />
                  <div className={`h-2 rounded-full ${c.bg} flex-1`} style={{ width: `${60 + row * 10}%` }} />
                  <div className="h-2 w-12 rounded-full bg-card/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

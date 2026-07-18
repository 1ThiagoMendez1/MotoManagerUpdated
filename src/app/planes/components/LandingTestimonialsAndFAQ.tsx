'use client';
import { Star } from 'lucide-react';
import { useState } from 'react';

const TESTIMONIALS = [
  {
    name: 'Carlos Rodríguez',
    role: 'Propietario · Moto Service Express, Medellín',
    avatar: 'CR',
    gradient: 'from-blue-500 to-cyan-500',
    stars: 5,
    text: 'MotoManager me ahorró horas de trabajo al mes. Antes llevaba todo en cuadernos, ahora en segundos sé cuántos repuestos tengo y cuánto he vendido en el mes.',
  },
  {
    name: 'Luisa Fernanda Torres',
    role: 'Administradora · Taller El Rápido, Bogotá',
    avatar: 'LT',
    gradient: 'from-purple-500 to-pink-500',
    stars: 5,
    text: 'El WhatsApp automático redujo las llamadas de seguimiento en un 80%. Los clientes reciben su notificación y eso nos ahorra muchísimo tiempo en el día.',
  },
  {
    name: 'Andrés Morales',
    role: 'Dueño · Motos y Más, Cali',
    avatar: 'AM',
    gradient: 'from-amber-500 to-orange-500',
    stars: 5,
    text: 'La integración de pagos con Wompi fue un cambio total. Ahora cobro de forma digital y llevo el control de todo desde mi celular sin complicaciones.',
  },
  {
    name: 'Jorge Patiño',
    role: 'Técnico · Taller Central, Barranquilla',
    avatar: 'JP',
    gradient: 'from-green-500 to-emerald-500',
    stars: 5,
    text: 'Como técnico, me encanta que puedo ver mis órdenes asignadas desde el celular. Ya no tengo que ir al escritorio a buscar información del cliente.',
  },
  {
    name: 'María Velásquez',
    role: 'Contadora · Motos del Norte, Bucaramanga',
    avatar: 'MV',
    gradient: 'from-red-500 to-rose-500',
    stars: 5,
    text: 'Los reportes exportables me ahorran al menos 4 horas semanales de trabajo contable. Descargo el Excel y ya tengo todo organizado por fechas y categorías.',
  },
  {
    name: 'Felipe Giraldo',
    role: 'Propietario · Moto Flash, Pereira',
    avatar: 'FG',
    gradient: 'from-indigo-500 to-purple-500',
    stars: 5,
    text: 'Tengo 3 técnicos y cada uno maneja sus propias órdenes. El sistema de roles es perfecto, no se mezclan los trabajos y yo veo todo desde mi cuenta.',
  },
];

const FAQS = [
  { q: '¿Hay período de prueba gratuito?', a: 'Actualmente no ofrecemos período de prueba, pero puedes empezar con el plan mensual desde $18.900 y cancelar cuando quieras. No hay compromisos a largo plazo.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Si deseas hacer un upgrade, comunícate con nuestro equipo de soporte por WhatsApp y te ayudamos sin costo adicional.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos tarjeta crédito/débito, Nequi, Daviplata, PSE y efectivo (corresponsales bancarios) a través de Wompi.' },
  { q: '¿Mis datos están seguros?', a: 'Sí. Toda la información se almacena de forma cifrada en servidores de alta disponibilidad con TLS en tránsito y cifrado en reposo.' },
  { q: '¿Cómo funciona el soporte técnico?', a: 'Soporte por WhatsApp de lunes a sábado de 8am a 6pm. Respondemos en promedio en menos de 2 horas durante el horario hábil.' },
  { q: '¿Puedo usar MotoManager desde el celular?', a: 'Sí, MotoManager es 100% responsive. Funciona perfectamente desde cualquier navegador en celular, tablet o computador.' },
  { q: '¿Cuántos técnicos puedo agregar?', a: 'Todos los planes incluyen técnicos ilimitados. Puedes agregar todo tu equipo sin costo adicional por usuario.' },
  { q: '¿Qué pasa si no renuevo mi suscripción?', a: 'Tu cuenta queda pausada pero todos tus datos se conservan por 90 días. Puedes reactivarla en cualquier momento.' },
  { q: '¿Puedo tener varios talleres en la misma cuenta?', a: 'Cada taller requiere su propia suscripción. Si tienes múltiples talleres, contáctanos para un plan especial con descuento.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-muted/20'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left text-foreground hover:bg-card/30 transition-colors"
      >
        <span className="font-medium text-sm md:text-base pr-4">{q}</span>
        <span className={`text-muted-foreground text-lg transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border/30 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export function LandingTestimonialsAndFAQ() {
  return (
    <>
      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-card/30 border border-border/30 text-muted-foreground text-sm font-medium">
              Testimonios
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-muted-foreground text-lg">Más de 500 talleres ya confían en MotoManager</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                className="p-6 rounded-2xl bg-card/30 border border-border/30 hover:border-border/50 hover:bg-card/[0.07] transition-all group flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed italic flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-foreground font-bold text-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 scroll-mt-20">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-card/30 border border-border/30 text-muted-foreground text-sm font-medium">
              Preguntas frecuentes
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">
              Resolvemos tus dudas
            </h2>
          </div>
          <div className="space-y-2">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>
    </>
  );
}

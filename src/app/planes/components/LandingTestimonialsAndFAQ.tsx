'use client';

import { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { getPlanLimits } from '@/lib/constants/plans';

const FAQS = [
  { question: '¿Necesito instalar un programa?', answer: 'No. MotoManager funciona desde el navegador de tu computador, tableta o celular. Solo necesitas acceso a internet y tu cuenta.' },
  { question: '¿Qué incluye cada plan?', answer: 'Básico cubre el registro de clientes, motos, órdenes, inventario y ventas con límites de uso. Pro añade agenda, técnicos y herramientas de contabilidad. Full amplía límites, permisos y paneles. La tabla de planes detalla las capacidades aplicadas por el sistema.' },
  { question: '¿Cuántos usuarios puedo registrar?', answer: `Según los límites de equipos implementados actualmente: Básico permite ${getPlanLimits('basic').users_limit} usuarios, Pro ${getPlanLimits('pro').users_limit} y Full no tiene un límite de usuarios por plan.` },
  { question: '¿Cómo funcionan los avisos por WhatsApp?', answer: `La cuota mensual que aplica el sistema es de ${getPlanLimits('basic').whatsapp_limit} para Básico y ${getPlanLimits('pro').whatsapp_limit} para Pro. Full no tiene tope mensual de plan. El envío efectivo depende de la configuración del proveedor y de sus políticas.` },
  { question: '¿Cómo se cobra la suscripción?', answer: 'Puedes elegir pago mensual, semestral o anual. Antes de pagar verás el total correspondiente al periodo seleccionado; el proceso de pago utiliza la integración con Wompi.' },
  { question: '¿Puedo volver a atender una moto que ya fue entregada?', answer: 'Sí. Su historial permanece asociado a la motocicleta. Una vez cerrada la orden anterior, puedes crear un nuevo ingreso sin volver a registrar la moto.' },
  { question: '¿Puedo cambiar de plan?', answer: 'El sistema contempla los planes Básico, Pro y Full. Si necesitas cambiarlo, consulta las opciones disponibles en tu suscripción o solicita ayuda desde los canales de soporte del sistema.' },
];

export function LandingTestimonialsAndFAQ() {
  const [active, setActive] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 bg-[#f6f8fc] px-5 py-24 text-slate-900 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Información clara</span>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">Antes de elegir, resuelve tus dudas.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
            Sin testimonios inventados ni promesas difíciles de comprobar. Estas respuestas se basan en las funciones y límites actuales del producto.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700">
            <MessageCircleQuestion className="h-5 w-5 text-sky-700" />
            ¿Tienes otra pregunta? Consulta el soporte desde tu cuenta.
          </div>
        </div>
        <div className="space-y-3">
          {FAQS.map((item, index) => (
            <div key={item.question} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setActive(current => current === index ? null : index)}
                aria-expanded={active === index}
                className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-6"
              >
                {item.question}
                <ChevronDown className={`h-5 w-5 shrink-0 text-sky-700 transition-transform ${active === index ? 'rotate-180' : ''}`} />
              </button>
              {active === index && (
                <p className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600 sm:px-6">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, CheckCircle2, ClipboardCheck, FileQuestion, PackageSearch, Smartphone } from 'lucide-react';

const BEFORE = [
  { icon: FileQuestion, problem: '¿En qué quedó esa moto?', solution: 'Consulta la orden, el técnico y el estado sin buscar en chats.' },
  { icon: PackageSearch, problem: '¿Cuánto nos queda de ese repuesto?', solution: 'Revisa existencias, productos y movimiento de inventario.' },
  { icon: Smartphone, problem: '¿Quién tiene los datos del cliente?', solution: 'Mantén cliente, motocicleta e historial relacionados.' },
];

export function LandingWhyChange() {
  return (
    <section className="bg-white px-5 py-20 text-[#101b2f] lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e76a08]">El costo del desorden</span>
          <h2 className="mt-5 text-4xl font-extrabold leading-[1.13] tracking-[-0.05em] sm:text-5xl">
            Tu tiempo vale más que buscar información.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            En un taller, los detalles hacen la diferencia. Una cotización por aquí,
            la placa en otro archivo, el inventario en una libreta. MotoManager
            ayuda a reunir esas piezas para que puedas tomar decisiones con claridad.
          </p>
          <a href="#demo" className="mt-7 inline-flex items-center gap-2 font-extrabold text-[#2368d9] transition hover:gap-3">
            Compruébalo en la demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="space-y-3">
          {BEFORE.map((item, i) => {
            const Icon = item.icon;
            return <div key={item.problem} className="grid gap-3 rounded-2xl border border-slate-200 bg-[#f5f8fc] p-5 sm:grid-cols-[0.82fr_1.18fr] sm:items-center sm:gap-6 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#e76a08]"><Icon className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Antes · {String(i + 1).padStart(2, '0')}</p>
                  <h3 className="mt-1 text-sm font-bold leading-6 text-slate-800">{item.problem}</h3>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white p-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#347df1]" />
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#347df1]">Con MotoManager</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{item.solution}</p>
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-7xl items-center gap-3 rounded-2xl border border-[#c9d9ed] bg-[#edf5ff] px-5 py-5 text-sm font-semibold text-[#244577] sm:px-7">
        <ClipboardCheck className="h-6 w-6 shrink-0 text-[#347df1]" />
        Una plataforma para conectar el recorrido de la moto, desde la recepción hasta la entrega y su próxima visita.
      </div>
    </section>
  );
}

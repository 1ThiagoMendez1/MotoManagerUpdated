'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, Phone, Search, Star, Store, Wrench, X } from 'lucide-react';
import { PublicWorkshop } from '@/actions/public-workshops';
import { WorkshopImage } from '@/components/workshops/WorkshopImage';
import { getWhatsAppLink } from '@/lib/utils';

export function LandingTopWorkshops({ initialWorkshops }: { initialWorkshops: PublicWorkshop[] }) {
  const [term, setTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const list = useMemo(() => {
    const q = term.trim().toLocaleLowerCase('es-CO');
    const rows = (initialWorkshops || []).filter(w => !q || [w.name, w.city, w.address]
      .some(v => (v || '').toLocaleLowerCase('es-CO').includes(q)));
    return rows.sort((a, b) => Number(b.review_count || 0) - Number(a.review_count || 0)
      || Number(b.average_rating || 0) - Number(a.average_rating || 0) || a.name.localeCompare(b.name));
  }, [initialWorkshops, term]);
  const visible = showAll || term.trim() ? list : list.slice(0, 3);
  const mapsUrl = (w: PublicWorkshop) => {
    if (w.maps_link?.startsWith('https://')) return w.maps_link;
    const q = [w.address, w.city].filter(Boolean).join(', ');
    return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : null;
  };
  return (
    <section id="workshops" className="scroll-mt-20 bg-[#f2f6fa] px-5 py-24 text-[#101c2f] lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#2670db]">
              <Store className="h-4 w-4" /> Comunidad MotoManager
            </span>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.05em] sm:text-5xl">
              Talleres reales. <span className="text-[#ec7711]">Historias reales.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Conoce talleres registrados en MotoManager. Consulta su ubicación y canales de atención cuando estén publicados.
              Las reseñas solo aparecen cuando existen opiniones verificadas.
            </p>
          </div>
          <div className="w-full max-w-md">
            <label htmlFor="directory-search" className="mb-2 block text-sm font-semibold text-slate-700">Buscar un taller</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="directory-search" value={term} onChange={e => { setTerm(e.target.value); setShowAll(true); }}
                placeholder="Nombre, ciudad o dirección" className="w-full rounded-xl border border-[#ccd8e5] bg-white py-3.5 pl-12 pr-11 text-sm text-[#101c2f] shadow-sm outline-none focus:border-[#347df1] focus:ring-2 focus:ring-[#347df1]/20" />
              {!!term && <button aria-label="Limpiar búsqueda" type="button" onClick={() => setTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>
        {visible.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(w => {
              const maps = mapsUrl(w);
              return <article key={w.id} className="group flex flex-col overflow-hidden rounded-[22px] border border-[#d6e1eb] bg-white shadow-[0_10px_35px_rgba(18,43,76,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(18,43,76,0.12)]">
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#102747] via-[#1b416c] to-[#ec7814]">
                  <WorkshopImage src={w.image_url} name={w.name} className="absolute inset-0 h-full w-full" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05162b]/65 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-5 rounded-lg border border-white/20 bg-[#091b34]/75 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white backdrop-blur">
                    <Wrench className="mr-1.5 inline h-3.5 w-3.5" /> Taller registrado
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-extrabold tracking-tight">{w.name}</h3>
                  {Number(w.review_count || 0) > 0
                    ? <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-amber-600">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {Number(w.average_rating || 0).toFixed(1)}
                        <span className="font-medium text-slate-500">({w.review_count} reseñas verificadas)</span>
                      </p>
                    : <p className="mt-2 text-xs font-medium text-slate-500">Sin reseñas verificadas todavía</p>}
                  <div className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#347df1]" />
                      <span>{[w.city, w.address].filter(Boolean).join(' · ') || 'Ubicación aún no publicada'}</span></p>
                    {w.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-[#347df1]" /> {w.phone}</p>}
                  </div>
                  {Number(w.review_count || 0) > 0 && w.recent_public_comment && (
                    <p className="mt-4 rounded-xl bg-[#f6f8fc] p-3 text-xs italic leading-6 text-slate-600">“{w.recent_public_comment}”</p>
                  )}
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                    <Link href={'/talleres/' + encodeURIComponent(w.slug)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#347df1] px-3 py-3 text-center text-xs font-extrabold text-white hover:bg-[#2166d7]">
                      Ver taller <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {w.phone
                      ? <a href={getWhatsAppLink(w.phone, 'Hola ' + w.name + ', los encontré en MotoManager. Quisiera consultar sobre sus servicios.')}
                          target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#c6d5e6] px-3 py-3 text-center text-xs font-bold text-[#23446d] hover:bg-[#f4f8fc]">
                          Contactar <Phone className="h-3.5 w-3.5" />
                        </a>
                      : maps
                        ? <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#c6d5e6] px-3 py-3 text-center text-xs font-bold text-[#23446d] hover:bg-[#f4f8fc]">
                            Ubicación <MapPin className="h-3.5 w-3.5" />
                          </a>
                        : <span className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-400">Sin contacto público</span>}
                  </div>
                </div>
              </article>;
            })}
          </div>
        ) : <div className="mt-10 rounded-2xl border border-dashed border-[#cad8e5] bg-white px-6 py-12 text-center">
          <Store className="mx-auto h-9 w-9 text-[#347df1]" />
          <p className="mt-4 font-bold">{term ? 'No encontramos talleres con esa búsqueda.' : 'Directorio de talleres en preparación'}</p>
          <p className="mt-2 text-sm text-slate-600">{term ? 'Prueba otra ciudad o nombre.' : 'Los talleres registrados aparecerán aquí cuando haya perfiles disponibles.'}</p>
        </div>}
        <div className="mt-9 flex flex-col items-center justify-between gap-5 rounded-2xl border border-[#cbddeb] bg-[#e9f3ff] p-5 sm:flex-row sm:p-6">
          <p className="flex items-start gap-3 text-sm font-semibold leading-6 text-[#25476d]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#347df1]" />
            Cada ficha se genera a partir de datos publicados por el taller. No creamos negocios ni valoraciones ficticias.
          </p>
          {!term && list.length > 3 &&
            <button type="button" onClick={() => setShowAll(v => !v)}
              className="w-full shrink-0 rounded-xl bg-[#0e2746] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#1a3e6a] sm:w-auto">
              {showAll ? 'Ver destacados' : 'Ver todos (' + list.length + ')'} <ArrowRight className="ml-1 inline h-4 w-4" />
            </button>}
        </div>
      </div>
    </section>
  );
}

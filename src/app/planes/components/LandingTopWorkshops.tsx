'use client';

import { useState, useEffect } from 'react';
import { Star, MapPin, Wrench, Trophy, CheckCircle2, Phone, Navigation, Search } from 'lucide-react';
import Link from 'next/link';
import { getWhatsAppLink } from '@/lib/utils';
import { getPublicWorkshops, PublicWorkshop } from '@/actions/public-workshops';
import { WorkshopSearchModal } from './WorkshopSearchModal';
import { WorkshopImage } from '@/components/workshops/WorkshopImage';

function getWorkshopVisuals(id: string) {
  const visuals = [
    {
      gradient: 'from-blue-600/40 via-blue-900/40 to-black',
      accent: 'text-blue-400',
      bgHover: 'group-hover:bg-blue-500/5',
      border: 'group-hover:border-blue-500/50',
      glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    },
    {
      gradient: 'from-orange-600/40 via-red-900/40 to-black',
      accent: 'text-orange-400',
      bgHover: 'group-hover:bg-orange-500/5',
      border: 'group-hover:border-orange-500/50',
      glow: 'group-hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]',
    },
    {
      gradient: 'from-emerald-600/40 via-green-900/40 to-black',
      accent: 'text-emerald-400',
      bgHover: 'group-hover:bg-emerald-500/5',
      border: 'group-hover:border-emerald-500/50',
      glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    },
    {
      gradient: 'from-purple-600/40 via-purple-900/40 to-black',
      accent: 'text-purple-400',
      bgHover: 'group-hover:bg-purple-500/5',
      border: 'group-hover:border-purple-500/50',
      glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    },
  ];
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return visuals[sum % visuals.length];
}

export function LandingTopWorkshops() {
  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadWorkshops() {
      const realWorkshops = await getPublicWorkshops('');
      const ranked = [...realWorkshops].sort((a,b) =>
        (Number(b.review_count || 0) > 0 ? 1 : 0) - (Number(a.review_count || 0) > 0 ? 1 : 0) ||
        Number(b.average_rating || 0) - Number(a.average_rating || 0) ||
        Number(b.review_count || 0) - Number(a.review_count || 0)
      );
      setWorkshops(ranked.slice(0,3));
    }
    loadWorkshops();
  }, []);

  return (
    <section id="workshops" className="py-24 px-4 scroll-mt-20 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute -left-40 top-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -right-40 bottom-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/40 border border-border/50 text-sm font-medium backdrop-blur-md shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-foreground">Talleres de nuestra comunidad</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight">
            Descubre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-blue-500">talleres reales</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
            Conoce talleres que usan MotoManager. Las estrellas y opiniones proceden exclusivamente de clientes con servicios entregados; nunca inventamos valoraciones.
          </p>
        </div>

        {workshops.length === 0 && <p className="rounded-2xl border border-border p-8 text-center text-muted-foreground">
          Estamos incorporando talleres a nuestra red. Explora el directorio para descubrir nuevas opciones.
        </p>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {workshops.map((workshop) => {
            const visuals = getWorkshopVisuals(workshop.id);
            const location = workshop.city || 'Ubicación no especificada';
            const address = workshop.address || '';
            const phone = workshop.phone || '';
            const specialty = 'Taller en MotoManager';
            const features = ['Consulta sus servicios', 'Solicita información', 'Conecta con el taller'];
            return (
              <div 
                key={workshop.id}
                className={`group relative rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-3 ${visuals.bgHover} ${visuals.border} ${visuals.glow}`}
              >
                {/* Header/Banner area */}
                <div className="h-48 relative overflow-hidden bg-muted dark:bg-[#090b11]">
                  <WorkshopImage src={workshop.image_url} name={workshop.name} className="absolute inset-0 h-full w-full" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${visuals.gradient} opacity-60 mix-blend-color`}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background dark:from-[#090b11] via-transparent to-transparent opacity-80"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                  
                  <div className="absolute top-4 right-4 bg-background/80 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/30 flex items-center gap-1.5 shadow-xl">
                    {workshop.review_count ? <>
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-sm text-foreground">{Number(workshop.average_rating).toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">({workshop.review_count} opiniones verificadas)</span>
                    </> : <span className="text-xs text-muted-foreground">Aún sin reseñas verificadas</span>}
                  </div>

                  <div className="absolute -bottom-8 left-8 p-4 bg-background dark:bg-[#090b11] rounded-2xl border border-border/60 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <Wrench className={`w-8 h-8 ${visuals.accent}`} />
                  </div>
                </div>

                {/* Content area */}
                <div className="pt-12 pb-8 px-8 space-y-6">
                  <div>
                    <h3 className={`text-2xl font-bold tracking-tight mb-3 ${visuals.accent} transition-colors`}>{workshop.name}</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-muted-foreground text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-foreground/50" />
                        <div>
                          <span className="block font-medium text-foreground/80">{location}</span>
                          <span className="block text-foreground/60">{address}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Phone className="w-4 h-4 shrink-0 text-foreground/50" />
                        <span className="font-medium text-foreground/80">{workshop.phone || 'Sin número'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-border/30">
                    <div className={`inline-block px-3 py-1 rounded-lg bg-background/50 border border-border/50 text-sm font-semibold shadow-inner ${visuals.accent}`}>
                      {specialty}
                    </div>
                    
                    <ul className="space-y-2.5">
                      {features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${visuals.accent}`} />
                          <span className="font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {workshop.review_count ? <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-xs text-muted-foreground">
                    {Math.round((Number(workshop.recommendation_count || 0) / workshop.review_count) * 100)}% de clientes lo recomiendan
                    {workshop.recent_public_comment &&
                      <blockquote className="mt-2 line-clamp-3 italic text-foreground/85">
                        “{workshop.recent_public_comment}” <span className="not-italic text-muted-foreground">— Cliente verificado</span>
                      </blockquote>}
                  </div> : null}

                  <div className="pt-4 flex gap-3">
                    {workshop.phone ? (
                      <Link href={getWhatsAppLink(workshop.phone, `Hola ${workshop.name}, los encontré en MotoManager. Quisiera consultar sobre sus servicios.`)} target="_blank" className="flex-1">
                        <button className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors flex items-center justify-center gap-2 font-semibold text-sm">
                          <Phone className="w-4 h-4" />
                          Contactar
                        </button>
                      </Link>
                    ) : (
                      <button disabled className="flex-1 py-2.5 px-4 rounded-xl bg-muted text-muted-foreground border border-border flex items-center justify-center gap-2 font-semibold text-sm opacity-50 cursor-not-allowed">
                        <Phone className="w-4 h-4" />
                        Sin número
                      </button>
                    )}
                    
                    {(workshop.maps_link || address) ? <Link href={workshop.maps_link || `https://maps.google.com/?q=${encodeURIComponent(address + ", " + location)}`} target="_blank" className="flex-1">
                      <button className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-muted text-foreground border border-border transition-colors flex items-center justify-center gap-2 font-semibold text-sm shadow-sm hover:shadow-md">
                        <Navigation className="w-4 h-4" />
                        Ubicación
                      </button>
                    </Link> : <button disabled className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground opacity-60">
                      Ubicación pendiente
                    </button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search Call to Action */}
        <div className="pt-8 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <Search className="w-6 h-6 relative z-10" />
            <span className="relative z-10">Explorar taller más cercano</span>
          </button>
        </div>
      </div>

      <WorkshopSearchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}

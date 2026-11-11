'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

// The full demo is an optional exploration, not initial mobile landing payload.
const Demo = dynamic(() => import('./LandingInteractiveDemo').then(module => module.LandingInteractiveDemo), {
  loading: () => <p role="status" className="px-5 py-12 text-center text-sm text-slate-300">Abriendo la demostración…</p>,
});

export function LandingDemoSection() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fromHash = () => { if (window.location.hash === '#demo') setOpen(true); };
    const fromLink = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a[href="#demo"]')) setOpen(true); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', fromLink);
    return () => { window.removeEventListener('hashchange', fromHash); document.removeEventListener('click', fromLink); };
  }, []);
  return <section id="demo" data-analytics-state={open ? 'open' : 'closed'} className="scroll-mt-20 border-b border-white/10 bg-[#071320] text-white">
    <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-5 py-9 md:flex-row md:items-center">
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Míralo antes de crear tu cuenta</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Conoce cómo funciona MotoManager</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Explora una demostración con datos ficticios. Para trabajar con los de tu taller, activa la prueba gratis.</p></div>
      <button type="button" aria-expanded={open} aria-controls="landing-live-demo" onClick={() => setOpen(current => !current)} data-analytics-id="demo_open" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200/30 px-5 text-sm font-semibold text-blue-100 hover:bg-white/5"><Play size={16}/>{open ? 'Ocultar demostración' : 'Abrir demo interactiva'}</button>
    </div>
    <div id="landing-live-demo">{open && <Demo/>}</div>
    {open && <div className="px-5 pb-9 text-center"><Link href="/prueba-gratis" data-analytics-id="demo_trial" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-400 px-6 font-bold text-slate-950">Crear mi taller gratis<ArrowRight size={17}/></Link></div>}
  </section>;
}

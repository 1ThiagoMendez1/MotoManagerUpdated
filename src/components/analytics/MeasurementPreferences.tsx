'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { META_PIXEL_CONSENT_KEY } from '@/lib/analytics/metaPixel';
import { privacySignal } from '@/lib/analytics/web-consent';
import { LEGACY_WEB_ANALYTICS_STORAGE_KEYS, MEASUREMENT_CHANGED, publicAnalyticsPath } from '@/lib/analytics/web-shared';

/** Only Meta advertising has a consent preference. Anonymous statistics
 * do not store identifiers and never show an analytics consent dialog. */
export function MeasurementPreferences(){
  const pathname=usePathname();
  const publicPage=publicAnalyticsPath(pathname)===pathname;
  const [open,setOpen]=useState(false);
  const [marketing,setMarketing]=useState(false);
  const [blocked,setBlocked]=useState(false);

  useEffect(()=>{
    if(!publicPage)return;
    const load=()=>{
      const disabled=privacySignal();
      setBlocked(disabled);
      try{setMarketing(!disabled&&localStorage.getItem(META_PIXEL_CONSENT_KEY)==='accepted');}
      catch{setMarketing(false);}
    };
    load();
    for(const key of LEGACY_WEB_ANALYTICS_STORAGE_KEYS){
      try{localStorage.removeItem(key);}catch{/* Storage can be disabled. */}
    }
    // Expire old first-party cookies; the collector never writes new ones.
    void fetch('/api/analytics/collect',{method:'DELETE',credentials:'same-origin',keepalive:true}).catch(()=>{});
    const reopen=()=>{load();setOpen(true);};
    window.addEventListener('mm:marketing-consent-settings',reopen);
    window.addEventListener('storage',load);
    return()=>{
      window.removeEventListener('mm:marketing-consent-settings',reopen);
      window.removeEventListener('storage',load);
    };
  },[publicPage]);

  const save=(ads:boolean)=>{
    const allowed=ads&&!privacySignal();
    try{
      if(!allowed)window.fbq?.('consent','revoke');
      localStorage.setItem(META_PIXEL_CONSENT_KEY,allowed?'accepted':'rejected');
      window.dispatchEvent(new Event(MEASUREMENT_CHANGED));
    }catch{/* Consent storage never blocks navigation. */}
    setMarketing(allowed);
    setOpen(false);
  };

  if(!publicPage)return null;
  return <div data-analytics-ignore="true">
    <button type="button" aria-label="Configurar privacidad publicitaria"
      aria-expanded={open} onClick={()=>setOpen(value=>!value)}
      className="fixed bottom-3 left-3 z-[110] inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#111c2e]/95 px-3 py-2 text-[11px] font-semibold text-slate-200 shadow-lg transition hover:border-orange-400/50 hover:text-white">
      <ShieldCheck size={14}/>Privacidad
    </button>
    {open&&<section role="dialog" aria-modal="false" aria-label="Privacidad publicitaria" className="fixed bottom-14 left-3 z-[120] w-[min(340px,calc(100vw-24px))] rounded-2xl border border-white/20 bg-[#111c2e] p-4 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold"><Cookie size={17} className="text-orange-300"/>Publicidad de Meta</p>
        <button type="button" aria-label="Cerrar privacidad" onClick={()=>setOpen(false)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><X size={16}/></button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-300">La estadística básica del sitio no guarda cookies ni identificadores en tu navegador. Solo Meta requiere tu permiso para medir anuncios.</p>
      <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 p-3">
        <input type="checkbox" checked={marketing} disabled={blocked} onChange={event=>setMarketing(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-400"/>
        <span><strong className="block text-xs">Permitir medición publicitaria de Meta</strong><span className="mt-1 block text-[11px] leading-4 text-slate-300">Activa el píxel de Meta para medir visitas y mejorar los anuncios.</span></span>
      </label>
      {blocked&&<p className="mt-2 text-xs text-orange-200">Tu navegador solicita no seguimiento; la publicidad permanece desactivada.</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={()=>save(false)} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10">Rechazar</button>
        <button type="button" onClick={()=>save(marketing)} className="rounded-lg bg-[#ff831b] px-3 py-2 text-xs font-bold text-slate-950 hover:bg-orange-300">Guardar</button>
      </div>
    </section>}
  </div>;
}

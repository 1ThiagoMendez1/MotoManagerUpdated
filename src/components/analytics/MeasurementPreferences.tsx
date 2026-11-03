'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChartNoAxesCombined, Cookie, ShieldCheck, X } from 'lucide-react';
import { META_PIXEL_CONSENT_KEY } from '@/lib/analytics/metaPixel';
import { analyticsVisitorSeed, privacySignal } from '@/lib/analytics/web-consent';
import { MEASUREMENT_CHANGED, publicAnalyticsPath, WEB_ANALYTICS_CONSENT_KEY, WEB_ANALYTICS_VISITOR_KEY } from '@/lib/analytics/web-shared';

export function MeasurementPreferences(){
  const pathname=usePathname();
  const publicPage=publicAnalyticsPath(pathname)===pathname;
  const [open,setOpen]=useState(false),[analytics,setAnalytics]=useState(false),[marketing,setMarketing]=useState(false),[blocked,setBlocked]=useState(false);
  useEffect(()=>{
    if(!publicPage)return;
    const load=()=>{
      try{setAnalytics(localStorage.getItem(WEB_ANALYTICS_CONSENT_KEY)==='accepted'&&!privacySignal());setMarketing(localStorage.getItem(META_PIXEL_CONSENT_KEY)==='accepted'&&!privacySignal());}catch{/* Necessary-only mode. */}
      setBlocked(privacySignal());
    };
    load();
    // Expire analytics cookies left by earlier deployments even when the
    // visitor now refuses tracking. This request never records a visit.
    void fetch('/api/analytics/collect',{method:'DELETE',credentials:'same-origin',keepalive:true}).catch(()=>{});
    try{if(!localStorage.getItem(WEB_ANALYTICS_CONSENT_KEY))setOpen(true);}catch{/* Do not interrupt access when browser storage is unavailable. */}
    const reopen=()=>{load();setOpen(true);};
    window.addEventListener('mm:marketing-consent-settings',reopen);
    return()=>window.removeEventListener('mm:marketing-consent-settings',reopen);
  },[publicPage]);
  const save=(firstParty:boolean,ads:boolean)=>{
    firstParty=firstParty&&!privacySignal();ads=ads&&!privacySignal();
    try{
      const previous=localStorage.getItem(WEB_ANALYTICS_CONSENT_KEY);
      if(firstParty)analyticsVisitorSeed();else localStorage.removeItem(WEB_ANALYTICS_VISITOR_KEY);
      localStorage.setItem(WEB_ANALYTICS_CONSENT_KEY,firstParty?'accepted':'rejected');
      if(!ads && localStorage.getItem(META_PIXEL_CONSENT_KEY)==='accepted')window.fbq?.('consent','revoke');
      localStorage.setItem(META_PIXEL_CONSENT_KEY,ads?'accepted':'rejected');
      if(previous==='accepted'&&!firstParty)void fetch('/api/analytics/collect',{method:'DELETE',credentials:'same-origin',keepalive:true}).catch(()=>{});
      window.dispatchEvent(new Event(MEASUREMENT_CHANGED));
    }catch{/* Choices never block registration, login, or browsing. */}
    setOpen(false);
  };
  if(!publicPage)return null;
  return <div data-analytics-ignore="true">
    {!open&&pathname!=='/'&&<button type="button" onClick={()=>window.dispatchEvent(new Event('mm:marketing-consent-settings'))}
      className="fixed bottom-3 left-3 z-[110] inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#111c2e] px-3 py-2 text-[11px] font-semibold text-slate-200 shadow-lg"><Cookie size={14}/>Privacidad y medición</button>}
    {open&&<section role="dialog" aria-modal="false" aria-label="Preferencias de medición" className="fixed bottom-4 left-4 right-4 z-[120] mx-auto max-w-lg rounded-2xl border border-white/20 bg-[#111c2e] p-5 text-white shadow-2xl md:left-auto md:right-6">
      <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-bold"><Cookie size={18} className="text-orange-300"/>Tu privacidad, tus preferencias</p><button type="button" aria-label="Cerrar preferencias" onClick={()=>setOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X size={17}/></button></div>
      <p className="mt-2 text-xs leading-5 text-slate-300">Tú eliges qué medición permites. Puedes usar MotoManager y cambiar tus preferencias cuando quieras.</p>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 p-3"><input type="checkbox" checked={analytics} disabled={blocked} onChange={event=>setAnalytics(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-400"/><span><span className="flex items-center gap-2 text-sm font-semibold"><ChartNoAxesCombined size={15}/>Analítica del sitio</span><span className="mt-1 block text-xs leading-5 text-slate-300">Visitas, fuentes, clics y desplazamiento para mejorar la web. No se guarda lo que escribes. Si usas una cuenta, podemos asociar tu visita con ella.</span></span></label>
      <label className="mt-2 flex items-start gap-3 rounded-xl border border-white/10 p-3"><input type="checkbox" checked={marketing} disabled={blocked} onChange={event=>setMarketing(event.target.checked)} className="mt-1 h-4 w-4 accent-orange-400"/><span><span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15}/>Medición publicitaria de Meta</span><span className="mt-1 block text-xs leading-5 text-slate-300">Permite usar el píxel de Meta para medir visitas y mejorar los anuncios de MotoManager.</span></span></label>
      {blocked&&<p className="mt-3 text-xs leading-5 text-slate-300">Tu navegador solicita no seguimiento. Respetamos esa preferencia.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>save(false,false)} className="rounded-lg border border-white/30 px-3 py-2.5 text-xs font-semibold hover:bg-white/10">Solo necesarias</button><button type="button" onClick={()=>save(analytics,marketing)} className="rounded-lg border border-orange-300/50 px-3 py-2.5 text-xs font-semibold text-orange-200 hover:bg-white/5">Guardar preferencias</button><button type="button" onClick={()=>save(true,true)} disabled={blocked} className="rounded-lg bg-[#ff831b] px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-orange-300 disabled:opacity-40">Permitir ambas</button></div>
    </section>}
  </div>;
}

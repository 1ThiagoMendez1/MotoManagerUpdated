'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { webMeasurementAllowed } from '@/lib/analytics/web-consent';
import { ANALYTICS_LAYOUT_VERSION, ANALYTICS_MODE, ANALYTICS_SESSION_MS, LEGACY_WEB_ANALYTICS_STORAGE_KEYS, publicAnalyticsPath, SECTION_LABELS, TARGET_LABELS,
  trafficAttribution, type AnalyticsBatch, type AnalyticsEvent, type AnalyticsLayout } from '@/lib/analytics/web-shared';
import { measuredDepth, normalizeClick, type ScrollGeometry } from '@/lib/analytics/web-geometry';
import { TRIAL_DIAGNOSTIC_EVENT, validTrialDiagnostic } from '@/lib/analytics/trial-events';

type Captured={layout:AnalyticsLayout;event:Omit<AnalyticsEvent,'layout'|'ageMs'>;at:number};
const round=(value:number)=>Math.round(value*1000000)/1000000;

function geometry(){
  const root=document.querySelector<HTMLElement>('.planes-root-override')||document.scrollingElement as HTMLElement||document.documentElement;
  const isDocument=root===document.documentElement||root===document.body;
  const rect=root.getBoundingClientRect();
  const info:ScrollGeometry={left:isDocument?0:rect.left,top:isDocument?0:rect.top,
    scrollLeft:isDocument?window.scrollX:root.scrollLeft,scrollTop:isDocument?window.scrollY:root.scrollTop,
    width:Math.max(root.clientWidth,root.scrollWidth),height:Math.max(root.clientHeight,root.scrollHeight),
    viewportHeight:isDocument?window.innerHeight:root.clientHeight};
  return {root,info};
}
function measureLayout(path:string):{layout:AnalyticsLayout;info:ScrollGeometry}|null{
  const {root,info}=geometry();
  if(info.width<100||info.width>20000||info.height<100||info.height>150000)return null;
  const ids=['hero','demo','why','funciones','como-funciona','prueba-gratis','planes','workshops','faq','closing'];
  const sections=[...root.querySelectorAll<HTMLElement>('main > section')].slice(0,20).map((section,index)=>{
    const box=section.getBoundingClientRect();const start=(box.top-info.top+info.scrollTop)/info.height;
    return {key:Object.hasOwn(SECTION_LABELS,section.id)?section.id:ids[index]||'page',
      start:round(Math.min(1,Math.max(0,start))),end:round(Math.min(1,Math.max(0,start+box.height/info.height)))};
  }).filter(section=>section.end>section.start);
  if(!sections.length)sections.push({key:'page',start:0,end:1});
  const campaign=document.querySelector('[data-campaign]')?.getAttribute('data-campaign')||'default';
  const states=[...root.querySelectorAll('[data-analytics-state]')].slice(0,4).map(el=>(el.id+'='+el.getAttribute('data-analytics-state')).replace(/[^a-zA-Z0-9_:=.-]/g,'').slice(0,30)).join(',');
  return {layout:{path,version:ANALYTICS_LAYOUT_VERSION,variant:(campaign+(states?','+states:'')).slice(0,120),
    viewportWidth:Math.max(100,Math.round(window.innerWidth)),viewportHeight:Math.max(100,Math.round(window.innerHeight)),
    width:Math.round(info.width),height:Math.round(info.height),sections},info};
}

function createTracker(getPath:()=>string){
  // Volatile per-script navigation seed; never saved or shared across reloads.
  const visitorSeed=crypto.randomUUID();
  const attribution=trafficAttribution(window.location.href,document.referrer);
  let path='',pageId=crypto.randomUUID(),queue:Captured[]=[],active=true,inFlight=false;
  let lastLayout:AnalyticsLayout|null=null,lastTick=performance.now(),lastConfirmed=performance.now(),visible=!document.hidden;
  let cooldown=0,scrollFrame=0,lastDepth=-1,lastRecordedDepth=-1;
  const current=()=>active&&webMeasurementAllowed()&&path===getPath()&&publicAnalyticsPath(path)===path;
  const push=(kind:AnalyticsEvent['kind'],values:Partial<AnalyticsEvent>={},layout=lastLayout)=>{
    if(!layout||!active)return;
    queue.push({layout,event:{id:crypto.randomUUID(),pageId,kind,...values},at:performance.now()});
    if(queue.length>100)queue.splice(Math.max(0,queue.findIndex(item=>item.event.kind!=='pageview')),1);
    if(queue.length>=20)void flush();
  };
  const capture=()=>{if(!current())return null;const measured=measureLayout(path);if(measured)lastLayout=measured.layout;return measured;};
  const engage=()=>{
    const now=performance.now(),seconds=Math.max(0,Math.min(30,(now-lastTick)/1000));lastTick=now;
    if(visible&&lastLayout&&seconds>.1)push('engagement',{seconds:Math.round(seconds*10)/10});
  };
  const depth=(force=false)=>{
    const measured=capture();if(!measured)return;
    const next=Math.round(measuredDepth(measured.info)*100)/100;
    lastDepth=Math.max(lastDepth,next);
    if(force||lastDepth-lastRecordedDepth>=5){push('scroll',{depth:lastDepth},measured.layout);lastRecordedDepth=lastDepth;}
  };
  async function flush(beacon=false){
    if(!webMeasurementAllowed()){queue=[];return;}
    if(Date.now()<cooldown||!queue.length||(inFlight&&!beacon))return;
    queue=queue.filter(item=>performance.now()-item.at<=60000);
    const selected:Captured[]=[],layouts:AnalyticsLayout[]=[],keys:string[]=[];
    for(const item of queue){
      const key=JSON.stringify(item.layout);let index=keys.indexOf(key);
      if(index<0){if(layouts.length===8)break;index=keys.push(key)-1;layouts.push(item.layout);}
      selected.push(item);if(selected.length===20)break;
    }
    if(!selected.length)return;
    queue.splice(0,selected.length);
    const batch:AnalyticsBatch={mode:ANALYTICS_MODE,batchId:crypto.randomUUID(),visitorSeed,attribution,layouts,
      events:selected.map(item=>({...item.event,layout:keys.indexOf(JSON.stringify(item.layout)),ageMs:Math.min(60000,Math.round(performance.now()-item.at))}))};
    const body=JSON.stringify(batch);
    if(beacon&&navigator.sendBeacon){
      if(navigator.sendBeacon('/api/analytics/collect',new Blob([body],{type:'application/json'})))return;
    }
    inFlight=true;
    try{
      const send=()=>fetch('/api/analytics/collect',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body,keepalive:true,
        signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(8000):undefined});
      let response:Response|undefined;
      for(let attempt=0;attempt<2;attempt++){
        try{response=await send();if(response.ok||response.status<500)break;}
        catch(error){if(attempt===1)throw error;}
        if(!active||!webMeasurementAllowed())break;
      }
      // The batch ID makes one transport retry idempotent in PostgreSQL.
      if(response?.ok)lastConfirmed=performance.now();
      if(response?.status===429||response?.status===503)cooldown=Date.now()+60000;
    }catch{/* Measurement must never interrupt browsing or account activation. */}
    finally{inFlight=false;if(active&&queue.length>=20)void flush();}
  }
  const navigate=(next:string,force=false)=>{
    if(!force&&next===path)return;
    if(path){engage();void flush();}
    path=next;pageId=crypto.randomUUID();lastLayout=null;lastDepth=-1;lastRecordedDepth=-1;lastTick=performance.now();formStarted=false;
    if(publicAnalyticsPath(path)!==path)return;
    const requested=pageId;
    void (document.fonts?.ready||Promise.resolve()).then(()=>requestAnimationFrame(()=>{
      if(!current()||pageId!==requested)return;
      const measured=capture();if(!measured)return;
      push('pageview',{},measured.layout);depth(true);void flush();
    }));
  };
  const onClick=(event:MouseEvent)=>{
    if(!current()||['/login','/register-workshop'].includes(path))return;
    const element=event.target instanceof Element?event.target:null;
    if(!element||element.closest('form,input,textarea,select,[contenteditable],[data-analytics-ignore],[role="dialog"]'))return;
    const measured=capture();if(!measured)return;
    const actionable=element.closest('a,button'),id=actionable?.getAttribute('data-analytics-id');
    let target='area';
    if(id&&Object.hasOwn(TARGET_LABELS,id))target=id;
    else if(actionable){
      const tag=actionable.tagName.toLowerCase();const section=actionable.closest('section')||document.body;
      const key=Object.hasOwn(SECTION_LABELS,section.id)?section.id:'page';
      const index=[...section.querySelectorAll(tag)].indexOf(actionable);
      target=(tag==='a'?'link':'button')+':'+key+':'+index;
    }
    const point=normalizeClick(event.clientX,event.clientY,measured.info);
    push('click',{x:round(point.x),y:round(point.y),target},measured.layout);depth();
  };
  let formStarted=false;
  const onInput=(event:Event)=>{
    if(current()&&path==='/prueba-gratis'&&!formStarted&&event.target instanceof Element&&event.target.closest('[data-trial-form]')){
      formStarted=true;capture();push('form_start');void flush();
    }
  };
  const onTrialProgress=(event:Event)=>{
    if(!current()||path!=='/prueba-gratis'||!(event instanceof CustomEvent)||!validTrialDiagnostic(event.detail))return;
    capture();push(event.detail.kind,{target:event.detail.target});void flush();
  };
  const onScroll=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;depth();});};
  const onVisibility=()=>{
    engage();visible=!document.hidden;lastTick=performance.now();
    if(!visible){if(current())depth(true);void flush(true);}
    else if(performance.now()-lastConfirmed>ANALYTICS_SESSION_MS)navigate(getPath(),true);
  };
  const onExit=()=>{engage();if(current())depth(true);void flush(true);};
  document.addEventListener('click',onClick,true);document.addEventListener('input',onInput,true);
  window.addEventListener(TRIAL_DIAGNOSTIC_EVENT,onTrialProgress);
  document.addEventListener('scroll',onScroll,true);document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('resize',onScroll);window.addEventListener('pagehide',onExit);
  const timer=window.setInterval(()=>{if(current()&&visible){engage();depth();void flush();}},15000);
  return {navigate,stop:()=>{
    // No geometry is read after the router has entered a private page.
    if(current()){engage();depth(true);}if(webMeasurementAllowed())void flush(true);else queue=[];
    active=false;clearInterval(timer);cancelAnimationFrame(scrollFrame);
    document.removeEventListener('click',onClick,true);document.removeEventListener('input',onInput,true);
    window.removeEventListener(TRIAL_DIAGNOSTIC_EVENT,onTrialProgress);
    document.removeEventListener('scroll',onScroll,true);document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('resize',onScroll);window.removeEventListener('pagehide',onExit);
  }};
}

export function WebAnalyticsTracker({isInternal=false}:{isInternal?:boolean}){
  const pathname=usePathname();const path=useRef(pathname);path.current=pathname;
  const tracker=useRef<ReturnType<typeof createTracker>|null>(null);
  const isPublic=publicAnalyticsPath(pathname)===pathname;
  useEffect(()=>{
    // Remove identifiers from prior versions; never create replacements.
    for(const key of LEGACY_WEB_ANALYTICS_STORAGE_KEYS){
      try{localStorage.removeItem(key);}catch{/* Storage might be blocked. */}
    }
  },[]);
  useEffect(()=>{
    if(!isPublic||isInternal||!webMeasurementAllowed())return;
    const instance=createTracker(()=>path.current);tracker.current=instance;instance.navigate(path.current);
    return()=>{instance.stop();tracker.current=null;};
  },[isPublic,isInternal]);
  useEffect(()=>{tracker.current?.navigate(pathname);},[pathname]);
  return null;
}

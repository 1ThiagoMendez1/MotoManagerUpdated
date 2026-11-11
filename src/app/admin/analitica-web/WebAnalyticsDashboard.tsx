'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, ChartNoAxesCombined, CheckCircle2, Clock3, Eye, Filter, Fingerprint, Globe2,
  Loader2, MousePointerClick, Pause, Play, RefreshCw, ShieldCheck, Smartphone, Sparkles, Users, AlertCircle } from 'lucide-react';
import { analyticsRange, CHANNEL_LABELS, type AnalyticsPayload, type Channel } from '@/lib/analytics/web-shared';
import { AnalyticsGeography, AnalyticsHeatmap } from './AnalyticsHeatmaps';
import styles from './analytics.module.css';
import { TrialSignupDiagnosticsCard } from './TrialSignupDiagnosticsCard';

const n=(value:number)=>Math.round(value).toLocaleString('es-CO');
const time=(value:string)=>new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const deviceLabel=(value:string)=>({mobile:'Celular',desktop:'Computador',tablet:'Tableta'}[value]||value);
function duration(seconds:number){if(seconds<60)return Math.round(seconds)+' s';return `${Math.floor(seconds/60)} min ${Math.round(seconds%60)} s`;}
function Empty({children}:{children:React.ReactNode}){return <p className={styles.emptyText}>{children}</p>;}
function BarList({rows,total,label}:{rows:{label:string;value:number}[];total?:number;label:string}){
  const maximum=Math.max(1,...rows.map(row=>row.value));
  return <div className={styles.barList} aria-label={label}>{!rows.length?<Empty>Sin datos registrados en este periodo.</Empty>:rows.map((row,index)=><div key={index} className={styles.barRow}><div style={{width:Math.max(2,row.value/maximum*100)+'%'}}/><span title={row.label}>{row.label}</span><strong>{n(row.value)}{total!==undefined&&<small>{total?Math.round(row.value/total*100):0}%</small>}</strong></div>)}</div>;
}

export function WebAnalyticsDashboard(){
  const today=analyticsRange('today').from.slice(0,10);
  const [period,setPeriod]=useState('today'),[custom,setCustom]=useState({start:today,end:today}),[draft,setDraft]=useState({start:today,end:today});
  const [channel,setChannel]=useState<Channel|'all'>('all'),[page,setPage]=useState('');
  const [heatPath,setHeatPath]=useState('/'),[heatDevice,setHeatDevice]=useState('all'),[layout,setLayout]=useState('');
  const [data,setData]=useState<AnalyticsPayload|null>(null),[error,setError]=useState(''),[notReady,setNotReady]=useState(false);
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[automatic,setAutomatic]=useState(true),[exporting,setExporting]=useState(false);
  const [metric,setMetric]=useState<'visits'|'visitors'|'pageviews'>('visits');
  const latest=useRef(0),controller=useRef<AbortController|null>(null);
  const query=new URLSearchParams({period,channel,heatPath,device:heatDevice});
  if(page)query.set('page',page);if(layout)query.set('layout',layout);
  if(period==='custom'){query.set('start',custom.start);query.set('end',custom.end);}
  const search=query.toString();
  const load=useCallback(async()=>{
    const id=++latest.current;controller.current?.abort();const current=new AbortController();controller.current=current;setRefreshing(true);
    try{
      const response=await fetch('/api/admin/web-analytics?'+search,{cache:'no-store',credentials:'same-origin',signal:current.signal});
      const payload=await response.json();if(id!==latest.current)return;
      if(!response.ok){
        if(response.status===401||response.status===403){setData(null);setAutomatic(false);}
        setNotReady(payload.code==='analytics_not_ready');if(payload.code==='analytics_not_ready')setData(null);
        throw new Error(payload.error||'No pudimos cargar la analítica.');
      }
      setData(payload);setError('');setNotReady(false);
    }catch(problem){if(id===latest.current&&!current.signal.aborted)setError(problem instanceof Error?problem.message:'No pudimos cargar los datos.');}
    finally{if(id===latest.current){setLoading(false);setRefreshing(false);}}
  },[search]);
  useEffect(()=>{void load();return()=>controller.current?.abort();},[load]);
  useEffect(()=>{if(!automatic)return;const timer=setInterval(()=>{if(!document.hidden)void load();},30000);return()=>clearInterval(timer);},[automatic,load]);
  const download=async()=>{
    setExporting(true);
    try{
      const response=await fetch('/api/admin/web-analytics/export?'+search,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw new Error('No se pudo exportar el informe. Vuelve a iniciar sesión si es necesario.');
      const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download='MotoManager-analitica-web.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(problem){setError(problem instanceof Error?problem.message:'No se pudo exportar.');}finally{setExporting(false);}
  };
  const report=data?.report;
  const metricLabel={visits:'Visitas',visitors:'Visitantes',pageviews:'Páginas vistas'}[metric];
  const chart=report?.series.map(item=>({...item,label:new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',...(new Date(data!.range.to).getTime()-new Date(data!.range.from).getTime()<=172800000?{hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short'})}).format(new Date(item.at))}));
  const changePeriod=(value:string)=>{setPeriod(value);if(value==='custom')setCustom(draft);};
  return <div className={styles.dashboard}>
    <div className={styles.topLine}><Link href="/admin"><ArrowLeft size={15}/>Panel de administración</Link><span><ShieldCheck size={13}/>Solo administrador de MotoManager</span></div>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>INTELIGENCIA DE TU PLATAFORMA</span><h1><span className={styles.titleIcon}><ChartNoAxesCombined size={26}/></span>Analítica web</h1><p>Entiende quién llega, qué le interesa y cómo se convierte en cliente.</p>
        <div className={styles.live}><i/>{report?n(report.active):'—'} visitantes con actividad reciente <span>· últimos 5 minutos</span></div>
      </div>
      <div className={styles.headerActions}><button type="button" className={styles.iconButton} aria-label={automatic?'Pausar actualización automática':'Activar actualización automática'} aria-pressed={automatic} onClick={()=>setAutomatic(value=>!value)}>{automatic?<Pause size={16}/>:<Play size={16}/>}</button><button type="button" className={styles.iconButton} aria-label="Actualizar analítica" onClick={()=>void load()} disabled={refreshing}><RefreshCw size={16} className={refreshing?'animate-spin':''}/></button><button type="button" className={styles.exportButton} onClick={()=>void download()} disabled={!data||exporting}>{exporting?<Loader2 size={15} className="animate-spin"/>:<ArrowDownToLine size={15}/>}Exportar CSV</button></div>
    </header>
    <div className={styles.filters}>
      <label><Clock3 size={15}/>Periodo<select aria-label="Periodo de analítica" value={period} onChange={event=>changePeriod(event.target.value)}><option value="today">Hoy</option><option value="yesterday">Ayer</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="custom">Fechas personalizadas</option></select></label>
      <label><Filter size={15}/>Página<select aria-label="Filtrar página" value={page} onChange={event=>setPage(event.target.value)}><option value="">Toda la web pública</option>{[...new Set(['/', '/prueba-gratis','/login',...(report?.pages.map(row=>row.path)||[])])].map(path=><option key={path} value={path}>{path}</option>)}</select></label>
      <div className={styles.refreshNote}>{refreshing?<><Loader2 size={12} className="animate-spin"/>Actualizando…</>:data?<>Actualizado {new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(data.fetchedAt))}</>:'Esperando datos'}<span>Hora de Bogotá · {automatic?'cada 30 s':'actualización manual'}</span></div>
    </div>
    {period==='custom'&&<div className={styles.customDates}><label>Desde<input type="date" value={draft.start} max={today} onChange={event=>setDraft(value=>({...value,start:event.target.value}))}/></label><label>Hasta<input type="date" value={draft.end} max={today} min={draft.start} onChange={event=>setDraft(value=>({...value,end:event.target.value}))}/></label><button type="button" onClick={()=>setCustom(draft)}>Aplicar fechas</button></div>}
    {error&&<div className={styles.error} role="alert"><AlertCircle size={20}/><div><strong>{notReady?'Analítica lista para activar':error}</strong>{notReady&&<p>Falta aplicar la migración de analítica en el servidor. El panel empezará a mostrar visitas reales después de activarla; no se reconstruyen visitas anteriores.</p>}{!notReady&&data&&<p>Se mantienen los últimos datos confirmados de {data.range.label.toLowerCase()}.</p>}</div><button type="button" onClick={()=>void load()}>Reintentar</button></div>}
    {loading&&!data?<div className={styles.loading} role="status"><Loader2 className="animate-spin" size={26}/><p>Cargando la actividad de MotoManager…</p></div>:report&&<div aria-busy={refreshing} className={styles.results}>
      <div className={styles.channels} aria-label="Canales de tráfico">{(['all','search_ai','social','referral','direct','ads'] as const).map(key=>{const value=key==='all'?report.channels.reduce((sum,row)=>sum+row.visits,0):report.channels.find(row=>row.channel===key)?.visits||0;return <button type="button" key={key} aria-pressed={channel===key} onClick={()=>setChannel(key)}><span>{CHANNEL_LABELS[key]}</span><strong>{n(value)}</strong><span className={styles.channelDot}/></button>;})}</div>
      {!report.totals.visits&&<div className={styles.firstVisit}><Sparkles size={18}/><div><strong>Todo preparado para tus primeras visitas medidas</strong><p>Las cifras se llenan con navegación anónima. Tus propias visitas de administrador y las páginas privadas de los talleres quedan fuera del tráfico web.</p></div></div>}
      <div className={styles.kpis}>{[
        {label:'Visitas',value:n(report.totals.visits),icon:Activity,note:'Sesiones de navegación'},
        {label:'Visitantes',value:n(report.totals.visitors),icon:Users,note:'Navegaciones anónimas estimadas'},
        {label:'Páginas vistas',value:n(report.totals.pageviews),icon:Eye,note:'Vistas registradas'},
        {label:'Tiempo activo',value:duration(report.totals.activeSeconds),icon:Clock3,note:'Promedio por visita'},
        {label:'Rebote',value:report.totals.bounceRate.toLocaleString('es-CO',{maximumFractionDigits:1})+'%',icon:MousePointerClick,note:'Una página y menos de 10 s'},
        {label:'Pruebas activadas',value:n(report.totals.trialActivations),icon:CheckCircle2,note:'Confirmadas en el servidor'},
      ].map(item=><article key={item.label} className={styles.kpi}><div><span>{item.label}</span><item.icon size={16}/></div><strong>{item.value}</strong><small>{item.note}</small></article>)}</div>
      <section className={styles.card}>
        <div className={styles.cardHeading}><div><span className={styles.eyebrow}>EVOLUCIÓN DEL TRÁFICO</span><h2>{metricLabel}<span className={styles.largeNumber}>{metric==='visits'?n(report.totals.visits):metric==='visitors'?n(report.totals.visitors):n(report.totals.pageviews)}</span></h2><p>{data!.range.label} · {CHANNEL_LABELS[channel]}</p></div><label className={styles.chartSelector}><span className="sr-only">Métrica del gráfico</span><select value={metric} onChange={event=>setMetric(event.target.value as typeof metric)}><option value="visits">Visitas</option><option value="visitors">Visitantes</option><option value="pageviews">Páginas vistas</option></select></label></div>
        <div className={styles.chart} role="img" aria-label={`${metricLabel} de ${data!.range.label}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:12,right:10,left:-22,bottom:0}}><defs><linearGradient id="webAnalyticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#438cf7" stopOpacity={.28}/><stop offset="1" stopColor="#438cf7" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--wa-grid)"/><XAxis dataKey="label" tick={{fontSize:10,fill:'var(--wa-muted)'}} axisLine={false} tickLine={false} minTickGap={28}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--wa-muted)'}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'var(--wa-card)',border:'1px solid var(--wa-border)',borderRadius:12,color:'var(--wa-text)',fontSize:12}} formatter={(value:number)=>[n(value),metricLabel]}/><Area type="monotone" dataKey={metric} stroke="#438cf7" strokeWidth={2.4} fill="url(#webAnalyticsArea)" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>
        <p className={styles.footnote}>Una visita representa navegación temporal en memoria; recargar la página inicia otra visita. El tiempo activo cuenta la pestaña visible. No incluye tráfico previo a la activación de esta medición.</p>
      </section>
      <div className={styles.twoColumns}>
        <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>ADQUISICIÓN</span><h2>Fuentes de tráfico</h2></div><Globe2 size={19}/></div><BarList label="Fuentes de tráfico" rows={report.sources.map(row=>({label:row.label,value:row.visits}))}/></section>
        <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>CONTENIDO</span><h2>Páginas más vistas</h2></div><ArrowUpRight size={19}/></div><BarList label="Páginas más vistas" rows={report.pages.map(row=>({label:row.path,value:row.views}))}/></section>
      </div>
      <AnalyticsGeography locations={report.locations} countries={report.countries} geo={data!.geo}/>
      <div className={styles.twoColumns}>
        <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>CONVERSIÓN</span><h2>Actividad y activaciones</h2></div><span className={styles.conversion}>Sin atribución individual</span></div><div className={styles.funnel}>{[
          ['Visitaron la web',report.funnel.visits],['Llegaron al registro',report.funnel.registration],['Iniciaron el formulario',report.funnel.formStarted],['Pruebas activadas (total)',report.totals.trialActivations],
        ].map(([label,value],index)=><div key={String(label)}><span className={styles.funnelNumber}>0{index+1}</span><span>{label}</span><strong>{n(Number(value))}</strong><i style={{width:Math.max(1,Number(value)/Math.max(1,report.funnel.visits)*100)+'%'}}/></div>)}</div><p className={styles.footnote}>La navegación es anónima y no se vincula con las cuentas. Los inicios antiguos pueden incluir foco automático; el diagnóstico del registro nuevo cuenta escritura real. Las activaciones del registro de accesos se muestran como total, sin atribuirlas a una visita.</p></section>
        <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>EXPERIENCIA</span><h2>Dispositivos</h2></div><Smartphone size={19}/></div><BarList label="Dispositivos" total={report.totals.visits} rows={report.devices.map(row=>({label:deviceLabel(row.device),value:row.visits}))}/><div className={styles.coverage}><ShieldCheck size={20}/><div><strong>Datos propios, acceso exclusivo</strong><p>{n(report.coverage.located)} de {n(report.coverage.total)} visitas con ubicación disponible. Historial de hasta {report.coverage.retentionDays} días.</p>{report.coverage.firstEvent&&<small>Primer dato registrado: {time(report.coverage.firstEvent)}</small>}</div></div></section>
      </div>
      <TrialSignupDiagnosticsCard data={report.signup}/>
      <AnalyticsHeatmap data={data!.heatmap} path={heatPath} device={heatDevice} pages={report.pages.map(row=>row.path)} onPath={value=>{setHeatPath(value);setLayout('');}} onDevice={value=>{setHeatDevice(value);setLayout('');}} onLayout={setLayout}/>
      <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>ATRIBUCIÓN</span><h2>Campañas UTM</h2><p>Fuente, medio y campaña de las visitas medidas. Las pruebas creadas se muestran como total del servidor; no se atribuyen individualmente a estas visitas.</p></div><span className={styles.tag}>{report.campaigns.length} campañas</span></div>{!report.campaigns.length?<Empty>Aún no hay visitas con etiquetas UTM. Usa utm_source, utm_medium y utm_campaign en tus enlaces publicitarios.</Empty>:<div className={styles.tableScroll}><table><thead><tr><th>Campaña</th><th>Fuente</th><th>Medio</th><th>Visitas</th></tr></thead><tbody>{report.campaigns.map((row,index)=><tr key={index}><td>{row.campaign}</td><td>{row.source}</td><td>{row.medium}</td><td>{n(row.visits)}</td></tr>)}</tbody></table></div>}</section>
      <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}><Fingerprint size={14}/>AUDIENCIA</span><h2>Quién visita la web</h2><p>Últimas 50 navegaciones anónimas del periodo. No se vinculan con identidades.</p></div></div>{!report.sessions.length?<Empty>Las próximas visitas aparecerán aquí, identificadas o anónimas según corresponda.</Empty>:<div className={styles.tableScroll}><table><thead><tr><th>Visitante</th><th>Actividad más reciente</th><th>Última página</th><th>Origen</th><th>Dispositivo</th><th>Ubicación aprox.</th></tr></thead><tbody>{report.sessions.map(row=><tr key={row.id}><td><strong>{row.email?(row.name||row.email):'Visitante '+row.visitorId.slice(0,8)}</strong><small>{row.email||'Navegador anónimo'}{row.workshop?' · '+row.workshop:''}</small></td><td>{time(row.lastSeen)}</td><td><code>{row.lastPath}</code></td><td>{row.source}</td><td>{deviceLabel(row.device)}</td><td>{[row.city,row.country].filter(Boolean).join(', ')||'No disponible'}</td></tr>)}</tbody></table></div>}</section>
      <section className={styles.card}><div className={styles.cardHeading}><div><span className={styles.eyebrow}><ShieldCheck size={14}/>ACCESOS VERIFICADOS</span><h2>Ingresos a cuentas y activaciones</h2><p>Eventos confirmados al iniciar sesión o crear un taller. No dependen del consentimiento publicitario.</p></div><span className={styles.tag}>Servidor</span></div>{!report.accesses.length?<Empty>Se registrarán los próximos inicios de sesión y las próximas activaciones. No se reconstruye el historial anterior.</Empty>:<div className={styles.tableScroll}><table><thead><tr><th>Cuenta</th><th>Evento</th><th>Fecha y hora</th><th>Taller</th><th>Dispositivo</th><th>Ubicación aprox.</th></tr></thead><tbody>{report.accesses.map((row,index)=><tr key={index}><td><strong>{row.name||row.email||'Cuenta verificada'}</strong><small>{row.email||'Identidad temporalmente no disponible'}</small></td><td><span className={row.kind==='trial_activated'?styles.trialBadge:styles.accessBadge}>{row.kind==='trial_activated'?'Prueba activada':'Inicio de sesión'}</span></td><td>{time(row.at)}</td><td>{row.workshop||'—'}</td><td>{deviceLabel(row.device)}<small>{row.browser}</small></td><td>{[row.city,row.country].filter(Boolean).join(', ')||'No disponible'}</td></tr>)}</tbody></table></div>}</section>
      <p className={styles.bottomNote}><ShieldCheck size={13}/>La navegación se mide sin cookies ni identificadores persistentes. Se respetan DNT y GPC y no se almacena la IP sin procesar. Todas las fechas se muestran en hora de Bogotá.</p>
    </div>}
  </div>;
}

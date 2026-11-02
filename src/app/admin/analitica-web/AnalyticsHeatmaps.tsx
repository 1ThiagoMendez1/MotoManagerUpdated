'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Flame, Globe2, MousePointer2, MoveDown, MapPin, Layers3 } from 'lucide-react';
import { SECTION_LABELS, TARGET_LABELS, type AnalyticsReport, type GeoStatus, type HeatmapData } from '@/lib/analytics/web-shared';
import styles from './analytics.module.css';

const count=(value:number)=>value.toLocaleString('es-CO');
const countryName=(value:string)=>{
  if(!value||value==='XX')return 'Ubicación no disponible';
  try{return new Intl.DisplayNames(['es'],{type:'region'}).of(value)||value;}catch{return value;}
};
export function AnalyticsGeography({locations,countries,geo}:{locations:AnalyticsReport['locations'];countries:AnalyticsReport['countries'];geo:GeoStatus}){
  const id=useId().replaceAll(':','');
  const [selected,setSelected]=useState<AnalyticsReport['locations'][number]|null>(null);
  const maximum=Math.max(1,...locations.map(item=>item.visits));
  return <section className={styles.card} aria-labelledby="analytics-geography-title">
    <div className={styles.cardHeading}><div><span className={styles.eyebrow}><Globe2 size={14}/>GEOGRAFÍA</span><h2 id="analytics-geography-title">De dónde llegan tus visitantes</h2><p>Concentración de visitas por ciudad aproximada.</p></div><span className={styles.tag}>{locations.length} ubicaciones</span></div>
    <div className={styles.geographyGrid}>
      <div className={styles.worldPanel}>
        <svg viewBox="0 0 1000 500" role="img" aria-label="Mapa de concentración de visitas por ubicación aproximada">
          <defs><filter id={id+'blur'}><feGaussianBlur stdDeviation="8"/></filter><radialGradient id={id+'heat'}><stop offset="0" stopColor="#ffc36c" stopOpacity=".95"/><stop offset=".4" stopColor="#ff8325" stopOpacity=".65"/><stop offset="1" stopColor="#fb5531" stopOpacity="0"/></radialGradient></defs>
          {[100,200,300,400].map(y=><line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#9ab7df12"/>)}
          {[125,250,375,500,625,750,875].map(x=><line key={x} x1={x} x2={x} y1="0" y2="500" stroke="#9ab7df12"/>)}
          <image href="/analytics/world-outline.svg" x="0" y="0" width="1000" height="500"/>
          {locations.map((item,index)=>{
            const x=(item.longitude+180)/360*1000,y=(90-item.latitude)/180*500,radius=12+23*Math.sqrt(item.visits/maximum);
            return <g key={index} onMouseEnter={()=>setSelected(item)} onMouseLeave={()=>setSelected(null)}>
              <circle cx={x} cy={y} r={radius} fill={`url(#${id}heat)`}/>
              <circle cx={x} cy={y} r="3" fill="#ffbd79" stroke="#fff3de" strokeWidth="1"><title>{item.city||countryName(item.country)} · {count(item.visits)} visitas · ubicación aproximada</title></circle>
            </g>;
          })}
        </svg>
        {!locations.length&&<div className={styles.mapEmpty}><MapPin size={27}/><strong>Las próximas visitas aparecerán aquí</strong><span>{geo.downloading?'La base de ubicación se está preparando.':geo.available?'Todavía no hay visitas con ubicación disponible.':'La base local de ubicación todavía no está disponible.'}</span></div>}
        {selected&&<div className={styles.mapTooltip}><strong>{selected.city||countryName(selected.country)}</strong><span>{countryName(selected.country)} · {count(selected.visits)} visitas</span></div>}
        <div className={styles.mapLegend}><span>Menos visitas</span><i/><span>Más visitas</span></div>
      </div>
      <div className={styles.countryList}><p className={styles.smallTitle}>Países y ciudades</p>{!countries.length&&<p className={styles.emptyText}>Sin ubicaciones registradas en este periodo.</p>}
        {countries.slice(0,6).map(item=><div key={item.country} className={styles.countryRow}><span>{countryName(item.country)}</span><strong>{count(item.visits)}</strong></div>)}
        {!!locations.length&&<div className={styles.cityList}>{locations.slice(0,8).map((item,index)=><button key={index} type="button" onMouseEnter={()=>setSelected(item)} onFocus={()=>setSelected(item)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(item)}><span><MapPin size={12}/>{item.city||countryName(item.country)}</span><strong>{count(item.visits)}</strong></button>)}</div>}
      </div>
    </div>
    <p className={styles.footnote}>Ubicación inferida por IP: representa una zona aproximada, no una dirección ni GPS. Hasta 200 ubicaciones. <a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> · <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a>.</p>
  </section>;
}

function clickTargetLabel(target:string){
  if(TARGET_LABELS[target])return TARGET_LABELS[target];
  const [type,section,index]=target.split(':');
  return `${TARGET_LABELS[type]||'Zona'} · ${SECTION_LABELS[section]||'Página'}${index?` ${Number(index)+1}`:''}`;
}
export function AnalyticsHeatmap({data,path,device,onPath,onDevice,onLayout,pages}:{data:HeatmapData;path:string;device:string;onPath:(path:string)=>void;onDevice:(device:string)=>void;onLayout:(layout:string)=>void;pages:string[]}){
  const [mode,setMode]=useState<'click'|'scroll'>('click');
  const canvas=useRef<HTMLCanvasElement>(null);
  const layout=data.layout;
  const height=layout?Math.min(1500,Math.max(450,layout.height/layout.width*650)):650;
  useEffect(()=>{
    const element=canvas.current,context=element?.getContext('2d');
    if(!element||!context||!layout)return;
    element.width=650;element.height=Math.round(height);context.clearRect(0,0,650,height);
    if(mode==='scroll'){
      const total=Math.max(1,data.scroll[0]?.visitors||layout.visitors);
      for(const band of data.scroll){const strength=band.visitors/total;context.fillStyle=`hsla(${25+strength*170},90%,52%,${.1+.5*strength})`;context.fillRect(0,band.depth/100*height,650,Math.max(1,height*.05));}
      return;
    }
    const density=document.createElement('canvas');density.width=650;density.height=element.height;
    const painter=density.getContext('2d');if(!painter)return;
    const radius=Math.max(8,Math.min(23,650/layout.width*24));
    for(const point of data.points){const x=point.x*650,y=point.y*height;const gradient=painter.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,'rgba(0,0,0,.35)');gradient.addColorStop(1,'rgba(0,0,0,0)');painter.fillStyle=gradient;painter.fillRect(x-radius,y-radius,radius*2,radius*2);}
    const image=painter.getImageData(0,0,650,element.height);
    for(let i=0;i<image.data.length;i+=4){const strength=image.data[i+3]/255;if(!strength)continue;image.data[i]=Math.min(255,60+strength*260);image.data[i+1]=Math.max(20,185-strength*130);image.data[i+2]=Math.max(15,255-strength*320);image.data[i+3]=Math.min(235,70+strength*220);}
    context.putImageData(image,0,0);
  },[data,height,layout,mode]);
  return <section className={styles.card} aria-labelledby="analytics-heat-title">
    <div className={styles.cardHeading}><div><span className={styles.eyebrow}><Flame size={14}/>COMPORTAMIENTO</span><h2 id="analytics-heat-title">Mapa de calor</h2><p>Clics y profundidad sobre la distribución medida de la página.</p></div><div className={styles.segmented} aria-label="Tipo de mapa"><button type="button" aria-pressed={mode==='click'} onClick={()=>setMode('click')}><MousePointer2 size={14}/>Clics</button><button type="button" aria-pressed={mode==='scroll'} onClick={()=>setMode('scroll')}><MoveDown size={14}/>Desplazamiento</button></div></div>
    <div className={styles.heatFilters}>
      <label>Página<select value={path} onChange={event=>onPath(event.target.value)}>{[...new Set(['/','/prueba-gratis',...pages])].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      <label>Dispositivo<select value={device} onChange={event=>onDevice(event.target.value)}><option value="all">Todos</option><option value="desktop">Computador</option><option value="mobile">Celular</option><option value="tablet">Tableta</option></select></label>
      <label className={styles.layoutFilter}>Vista capturada<select value={layout?.id||''} onChange={event=>onLayout(event.target.value)}><option value="" disabled>{data.layouts.length?'Selecciona una vista':'Esperando primeras interacciones'}</option>{data.layouts.map(item=><option key={item.id} value={item.id}>{item.viewportWidth} × {item.viewportHeight} · {item.variant.slice(0,42)} · {item.visitors} visitas · {item.id.slice(0,5)}</option>)}</select></label>
    </div>
    {!layout?<div className={styles.largeEmpty}><Layers3 size={36}/><h3>El mapa se construye con visitas reales</h3><p>Al recibir navegación autorizada verás las vistas capturadas, sus clics y hasta dónde llegan los visitantes. Prueba otra página o dispositivo si ya hay datos.</p></div>:<div className={styles.heatGrid}>
      <div>
        <div className={styles.heatCaption}><span>{layout.viewportWidth} × {layout.viewportHeight} px de pantalla</span><span>{count(layout.visitors)} visitas en esta vista</span></div>
        <div className={styles.heatViewport}>
          <div className={styles.heatDocument} style={{aspectRatio:`650 / ${height}`}}>
            {layout.sections.map((section,index)=><div key={index} className={styles.pageSection} style={{top:section.start*100+'%',height:(section.end-section.start)*100+'%'}}><span>{SECTION_LABELS[section.key]||'Sección'}</span></div>)}
            <canvas ref={canvas} className={styles.heatCanvas} role="img" aria-label={mode==='click'?`Distribución de ${data.totalClicks} clics registrados`:'Profundidad de desplazamiento de los visitantes'}/>
            {[0,25,50,75,100].map(value=><span key={value} className={styles.depthMarker} style={{top:`calc(${value}% - ${value===100?14:0}px)`}}>{value}%</span>)}
          </div>
        </div>
        <p className={styles.footnote}>Cada vista conserva versión, dimensiones y secciones. No se mezclan diseños diferentes. {data.sampled?`Se dibujan los últimos ${count(data.points.length)} de ${count(data.totalClicks)} clics.`:`${count(data.totalClicks)} clics registrados.`}</p>
      </div>
      <div className={styles.heatDetails}>
        <div className={styles.heatScore}><span>{mode==='click'?'Clics en esta vista':'Llegaron al 75% de la página'}</span><strong>{mode==='click'?count(data.totalClicks):count(data.scroll.find(item=>item.depth===75)?.visitors||0)}</strong><small>{mode==='click'?'Coordenadas medidas sobre el documento':'Visitas únicas con desplazamiento registrado'}</small></div>
        <h3 className={styles.smallTitle}>{mode==='click'?'Zonas con más interacción':'Alcance por profundidad'}</h3>
        {mode==='click'?(!data.targets.length?<p className={styles.emptyText}>Aún no hay clics en esta vista.</p>:data.targets.map(item=><div key={item.target} className={styles.targetRow}><span>{clickTargetLabel(item.target)}</span><strong>{count(item.clicks)}</strong></div>)):data.scroll.filter(item=>item.depth%25===0).map(item=><div key={item.depth} className={styles.targetRow}><span>{item.depth}% de la página</span><strong>{count(item.visitors)}</strong></div>)}
        <p className={styles.footnote}>Las áreas representan las secciones medidas, no una grabación de pantalla. No se capturan textos escritos, contraseñas ni clics dentro de formularios.</p>
      </div>
    </div>}
  </section>;
}

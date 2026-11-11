'use client';
import { TreePine, Eye, EyeOff, Sparkles } from 'lucide-react';
import styles from './workshop-christmas.module.css';

export function WorkshopGarland() {
  return <div className={styles.garland} aria-hidden="true">
    {[false,true].map(flipped=><svg key={String(flipped)} className={flipped?styles.rightBranch:styles.leftBranch} viewBox="0 0 260 45" fill="none">
      <path d="M-12 4C62 28 145 7 263 5" stroke="var(--holiday-pine)" strokeWidth="3"/>
      {[12,36,62,90,121,154,188,224].map((x,i)=><g key={x}>
        <path d={`M${x} 13l-11 8m11-8l-6 15m6-15l8 9m-8-9l3-10m-3 10l-8-9`} stroke="var(--holiday-pine)" strokeWidth="2.4" strokeLinecap="round"/>
        {i%2===0&&<><path d={`M${x+9} 13v10`} stroke="var(--holiday-gold)"/><circle cx={x+9} cy="27" r={i===4?4.5:3} fill={i===0?'#3b82f6':'var(--holiday-gold)'}/></>}
      </g>)}
      {[25,80,138,204,245].map(x=><circle key={x} cx={x} cy="10" r="1.7" fill="var(--holiday-light)"/>)}
    </svg>)}
    <div className={styles.lightThread}/>
  </div>;
}
export function WorkshopChristmasBar({enabled,onToggle}:{enabled:boolean;onToggle:()=>void}) {
  return <div className={styles.seasonBar} data-season-enabled={enabled}>
    <div className={styles.seasonTitle}><span className={styles.treeBadge}><TreePine size={14}/></span>
      <span>Navidad en tu taller</span><Sparkles className={styles.sparkle} size={12}/>
      <span className={styles.seasonCaption}>Un detalle especial para acompañar tu jornada</span>
    </div>
    <button type="button" onClick={onToggle} className={styles.toggle} aria-pressed={enabled}
      aria-label={enabled?'Ocultar decoración navideña':'Mostrar decoración navideña'}>
      {enabled?<EyeOff size={13}/>:<Eye size={13}/>}<span>{enabled?'Ocultar adornos':'Mostrar adornos'}</span>
    </button>
  </div>;
}

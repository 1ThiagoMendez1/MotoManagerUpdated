import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Bike, Boxes, Check, CheckCircle2, ClipboardList,
  CreditCard, Gift, HeartHandshake, Play, ShieldCheck, ShoppingBag,
  Sparkles, Star, TreePine, UsersRound, Wrench,
} from 'lucide-react';
import styles from './christmas.module.css';


export function ChristmasRibbon() {
  return <div className={styles.ribbon}>
    <div className={styles.ribbonInner}>
      <div className={styles.ribbonMessage}><Sparkles size={15} /><span>Especial de Navidad · <strong>15 días de Full sin pagar</strong></span></div>
      <Link href="/prueba-gratis" data-analytics-id="ribbon_trial" className={styles.ribbonLink}>Activar prueba <ArrowRight size={14} /></Link>
    </div>
  </div>;
}

export function ChristmasHero() {
  return <section id="hero" aria-labelledby="christmas-hero-title" className={styles.hero}>
    <div className={styles.lightWire} aria-hidden="true">
      {Array.from({length: 13}, (_,index) => <span key={index} className={styles.bulb} />)}
    </div>
    <span aria-hidden="true" className={styles.pineLeft}><TreePine /></span>
    <span aria-hidden="true" className={styles.pineRight}><TreePine /></span>
    <div aria-hidden="true" className={styles.glowOne} />
    <div aria-hidden="true" className={styles.glowTwo} />
    <div className={styles.heroContainer}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><Star size={14} fill="currentColor" /> NAVIDAD 2026 · PARA TALLERES DE COLOMBIA</span>
        <span className={styles.holidayLabel}><Gift size={15} /> Esta Navidad, atiende con más tranquilidad</span>
        <h1 id="christmas-hero-title" className={styles.title}>Menos “¿cómo va mi moto?”. <span>Más control de tu taller.</span></h1>
        <p className={styles.description}>Tu cliente consulta el estado de su moto desde su portal. Tú organizas <strong>órdenes, repuestos y ventas</strong> en un solo lugar. Pruébalo con tu taller real durante 15 días.</p>
        <div className={styles.actions}>
          <Link href="/prueba-gratis" data-analytics-id="hero_trial" className={styles.primaryCta}>Crear mi taller gratis <ArrowRight size={20} /></Link>
          <a href="#demo" data-analytics-id="hero_demo" className={styles.secondaryCta}><Play size={17} /> Ver cómo funciona</a>
        </div>
        <div className={styles.assurances}>
          <span><CheckCircle2 size={15} /> Sin tarjeta</span>
          <span><CheckCircle2 size={15} /> Sin cobros automáticos</span>
          <span><CheckCircle2 size={15} /> Full durante 15 días</span>
        </div>
      </div>
      <div className={styles.productStage}>
        <div className={styles.santaScene}>
          <Image
            src="/campaigns/navidad-santa-motero-2026.svg"
            alt="Papá Noel viaja en motocicleta con regalos por un pueblo colombiano iluminado para Navidad"
            fill
            priority
            unoptimized
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 650px, 770px"
            className={styles.santaArt}
          />
          <span className={styles.santaSpark} aria-hidden="true">✦</span>
        </div>
        <div className={styles.starlight} aria-hidden="true">✦</div>
        <span className={styles.giftAccent} aria-hidden="true"><Gift size={38}/></span>
      </div>
    </div>
    <div className={styles.trustRail}>
      <span><Bike size={18} /> Para talleres de Colombia</span>
      <span><CreditCard size={18} /> Prueba sin tarjeta</span>
      <span><HeartHandshake size={18} /> Tú decides después</span>
      <a href="#demo">Conoce el sistema <ArrowRight size={16}/></a>
    </div>
  </section>;
}

export function ChristmasDemoGuide(){
  return <section id="como-empezar" className="border-b border-white/10 bg-[#0b1928] px-5 py-8 text-white">
    <div className="mx-auto max-w-6xl">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-orange-200">Tu primera orden empieza aquí</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">{[
        ['1', 'Crea tu taller', 'Tu nombre, el taller y tu acceso. Sin tarjeta.'],
        ['2', 'Registra una moto', 'Usa los datos de un cliente de tu propio taller.'],
        ['3', 'Abre tu primera orden', 'Lleva el diagnóstico, los servicios y los repuestos.'],
      ].map(([number,title,body]) => <div key={number} className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-orange-300/25 text-sm font-bold text-orange-200">{number}</span><div><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{body}</p></div></div>)}</div>
    </div>
  </section>;
}

export function ChristmasTrialOffer({fullPrice}:{fullPrice:number}) {
  const monthly = fullPrice.toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  return <section id="prueba-gratis" className={styles.offerSection}>
    <div className={styles.offerCard}>
      <div className={styles.offerCopy}>
        <span className={styles.offerEyebrow}><Gift size={16}/> ESPECIAL DE NAVIDAD · PLAN FULL</span>
        <h2>El mejor regalo para tu taller es <em>tener todo bajo control.</em></h2>
        <p>Empieza con el plan Full y comprueba cómo se siente trabajar con la información de tu negocio conectada.</p>
        <ul>
          {['Clientes, motos y órdenes en un mismo sistema','Inventario, ventas, finanzas y equipo','Tus propios datos durante la prueba'].map(item=><li key={item}><Check size={16}/>{item}</li>)}
        </ul>
      </div>
      <div className={styles.offerPriceCard}>
        <div className={styles.bow} aria-hidden="true"><Gift size={38}/></div>
        <span>ACTIVA FULL PARA TU TALLER</span>
        <strong>15 <small>días</small></strong>
        <b>GRATIS</b>
        <p>Hoy: $0 · Sin tarjeta ni cargos automáticos.</p>
        <Link href="/prueba-gratis" data-analytics-id="offer_trial" className={styles.offerButton}>Crear mi taller gratis <ArrowRight size={18}/></Link>
        <p className={styles.afterTrial}>Después eliges: Full desde {monthly}/mes, otro plan o no continuar.</p>
      </div>
    </div>
  </section>;
}

export function ChristmasMobileDock({user=false}:{user?:boolean}) {
  return <nav className={styles.mobileDock} aria-label="Acceso rápido a la prueba y demostración">
    <Link href={user?'/dashboard/subscription':'/prueba-gratis'} data-analytics-id="nav_trial" className={styles.dockPrimary}>
      {user?'Ver mi suscripción':'Probar Full 15 días gratis'} <ArrowRight size={18}/>
    </Link>
    <a href="#demo" data-analytics-id="hero_demo" className={styles.dockDemo}><Play size={16} fill="currentColor"/><span>Demo</span></a>
  </nav>;
}

export function ChristmasClosing(){
  return <section className={styles.closing}>
    <div className={styles.closingInner}><span><Sparkles size={17}/> QUE DICIEMBRE TE ENCUENTRE PREPARADO</span><h2>Las motos seguirán llegando.<br/><em>Que tu taller tenga todo en orden.</em></h2><p>Conoce MotoManager durante 15 días sin pagar. Lo importante es descubrir si hace más sencillo tu trabajo.</p><Link href="/prueba-gratis" data-analytics-id="closing_trial">Crear mi taller gratis <ArrowRight size={19}/></Link></div>
  </section>;
}

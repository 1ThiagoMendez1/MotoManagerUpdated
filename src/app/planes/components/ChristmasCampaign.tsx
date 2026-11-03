import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Bike, Boxes, Check, CheckCircle2, ClipboardList,
  CreditCard, Gift, HeartHandshake, Play, ShieldCheck, ShoppingBag,
  Sparkles, Star, TreePine, UsersRound, Wrench,
} from 'lucide-react';
import styles from './christmas.module.css';

const WORKSHOP_TOOLS = [
  { icon: UsersRound, label: 'Clientes', tone: 'green' },
  { icon: Bike, label: 'Motocicletas', tone: 'orange' },
  { icon: Boxes, label: 'Inventario', tone: 'gold' },
  { icon: ShoppingBag, label: 'Ventas y caja', tone: 'blue' },
];

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
        <span className={styles.holidayLabel}><Gift size={15} /> Que diciembre no te coja en desorden</span>
        <h1 id="christmas-hero-title" className={styles.title}>Esta Navidad, pon tu taller en <span>modo Full.</span></h1>
        <p className={styles.description}>En Colombia, diciembre pone a prueba la organización del taller. Lleva <strong>órdenes, clientes, motos, repuestos y ventas</strong> en un solo lugar y atiende con más tranquilidad.</p>
        <div className={styles.actions}>
          <Link href="/prueba-gratis" data-analytics-id="hero_trial" className={styles.primaryCta}>Activar mis 15 días gratis <ArrowRight size={20} /></Link>
          <a href="#demo" data-analytics-id="hero_demo" className={styles.secondaryCta}><Play size={17} fill="currentColor" /> Probar la demo</a>
        </div>
        <div className={styles.assurances}>
          <span><CheckCircle2 size={15} /> Sin tarjeta</span>
          <span><CheckCircle2 size={15} /> Sin cobros automáticos</span>
          <span><CheckCircle2 size={15} /> Prueba Full completa</span>
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
        <div className={styles.productCard}>
          <div className={styles.productBar}>
            <div className={styles.brandMini}><span><Wrench size={17}/></span><div><strong>MotoManager</strong><small>Taller de ejemplo · Vista ilustrativa</small></div></div>
            <span className={styles.newOrder}>+ Nueva orden</span>
          </div>
          <div className={styles.productContent}>
            <div className={styles.productHeading}><small>TU CENTRO DE OPERACIONES</small><h2>Tu taller, bajo control.</h2><p>Todo conectado para tu día a día.</p></div>
            <div className={styles.featureMain}>
              <div className={styles.workOrder}>
                <span className={styles.iconBlue}><ClipboardList size={18}/></span>
                <strong>Órdenes de trabajo</strong>
                <p>Recibe, diagnostica y entrega sin perder el hilo.</p>
                <div className={styles.orderStatus}><span className={styles.statusDot} /> Moto DEMO-01 <b>En proceso</b></div>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.iconGreen}><ShieldCheck size={18}/></span>
                <strong>Historial listo</strong>
                <p>Cliente, moto y servicios en un mismo lugar.</p>
              </div>
            </div>
            <div className={styles.productModules}>
              {WORKSHOP_TOOLS.map(item=>{const Icon=item.icon;return <div key={item.label} className={styles.productModule}><span data-tone={item.tone}><Icon size={15}/></span><strong>{item.label}</strong></div>;})}
            </div>
            <div className={styles.productFooter}><span><Check size={13}/> Demo con datos de ejemplo</span><a href="#demo">Explorar ahora <ArrowRight size={13}/></a></div>
          </div>
        </div>
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
  return <div className={styles.demoGuide}>
    <div className={styles.demoGuideInner}>
      <span className={styles.playBadge}><Play size={19} fill="currentColor"/></span>
      <div><span className={styles.miniEyebrow}>ANTES DE DECIDIR, PRUÉBALO</span><h2>La demo sí se puede usar.</h2><p>Abre una orden, mira inventario y recorre el sistema sin registrarte. Es un ejemplo, no tu taller real.</p></div>
      <a href="#demo" data-analytics-id="hero_demo" className={styles.demoGuideButton}>Explorar demo <ArrowRight size={17}/></a>
    </div>
  </div>;
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
        <Link href="/prueba-gratis" data-analytics-id="offer_trial" className={styles.offerButton}>Quiero mis 15 días gratis <ArrowRight size={18}/></Link>
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
    <div className={styles.closingInner}><span><Sparkles size={17}/> QUE DICIEMBRE TE ENCUENTRE PREPARADO</span><h2>Las motos seguirán llegando.<br/><em>Que tu taller tenga todo en orden.</em></h2><p>Conoce MotoManager durante 15 días sin pagar. Lo importante es descubrir si hace más sencillo tu trabajo.</p><Link href="/prueba-gratis" data-analytics-id="closing_trial">Empezar mi prueba gratis <ArrowRight size={19}/></Link></div>
  </section>;
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, ClipboardList, CreditCard, Pause, Play, PlayCircle, Sparkles } from 'lucide-react';
import { HalloweenDecor } from './HalloweenDecor';
import styles from './halloween.module.css';

export function HalloweenRibbon() {
  return <div className={styles.ribbon}>
    <div className={styles.ribbonInner}>
      <span className={styles.ribbonLabel}><HalloweenDecor kind="pumpkin" /> EDICIÓN HALLOWEEN</span>
      <p>Un trato de miedo: <strong>15 días de Full por $0.</strong> Sin tarjeta.</p>
      <Link href="/prueba-gratis">Quiero mi prueba <ArrowRight size={14} /></Link>
    </div>
  </div>;
}

export function HalloweenHero({ onScrollToPlanes }: { onScrollToPlanes: () => void }) {
  const [effects, setEffects] = useState(true);
  return <section className={styles.hero} aria-labelledby="halloween-title" data-effects={effects ? 'on' : 'off'}>
    <HalloweenDecor kind="web" className={styles.webLeft} />
    <HalloweenDecor kind="web" className={styles.webRight} />
    <div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}><span /> SOFTWARE PARA TALLERES DE MOTOS</span>
        <div className={styles.editionLabel}><HalloweenDecor kind="candy" /> TRATO, SIN TRUCOS.</div>
        <h1 id="halloween-title" className={styles.heroTitle}>Entierra el<br /><span>desorden.</span><em>Dale vida a tu taller.</em></h1>
        <p className={styles.heroDescription}>Las órdenes perdidas, los repuestos fantasma y las cuentas de miedo se quedan atrás. Conecta tu taller con MotoManager y estrena <strong>15 días de nuestro plan Full gratis.</strong></p>
        <div className={styles.heroActions}>
          <Link href="/prueba-gratis" className={styles.primaryButton}>Quiero mis 15 días gratis <ArrowRight size={19} /></Link>
          <a href="#demo" className={styles.secondaryButton}><PlayCircle size={19} /> Verlo en acción</a>
        </div>
        <div className={styles.reassurance}>
          <span><Check size={15} /> Sin tarjeta</span>
          <span><Check size={15} /> Sin cobros automáticos</span>
          <span><Check size={15} /> Tus datos, tu taller</span>
        </div>
        <button type="button" onClick={onScrollToPlanes} className={styles.pricingLink}>Después de la prueba, tú eliges tu plan <ArrowRight size={14} /></button>
      </div>
      <div className={styles.heroScene}>
        <div className={styles.moon} aria-hidden="true" />
        <div className={styles.orbit} aria-hidden="true" />
        <HalloweenDecor kind="bat" className={styles.batOne} />
        <HalloweenDecor kind="bat" className={styles.batTwo} />
        <span className={styles.sceneCaption}>UNA EDICIÓN DE MIEDO.<br /><strong>UN TALLER CON MÁS VIDA.</strong></span>
        <div className={styles.artwork}>
          <Image src="/campaigns/halloween-garage-2026.webp" alt="Mecánico esqueleto junto a una moto naranja, calabazas iluminadas, un ataúd y dulces de Halloween" fill priority unoptimized sizes="(max-width: 640px) 110vw, (max-width: 1023px) 80vw, 760px" className={styles.heroImage} />
        </div>
        <div className={styles.trialSeal}>
          <span>FULL TALLER</span><strong>15</strong><span>DÍAS GRATIS</span>
          <Sparkles size={16} />
        </div>
        <button type="button" onClick={() => setEffects(current => !current)} aria-pressed={!effects} className={styles.effectsButton}>
          {effects ? <Pause size={12} /> : <Play size={12} />}{effects ? 'Pausar efectos' : 'Activar efectos'}
        </button>
      </div>
    </div>
    <div className={styles.featureRail}>
      <span><ClipboardList size={16} /> Órdenes e historial</span><i aria-hidden="true" />
      <span>Inventario y ventas</span><i aria-hidden="true" />
      <span>Caja y finanzas</span><i aria-hidden="true" />
      <span>Agenda y equipo</span>
      <a href="#funciones">Conoce todo lo que incluye <ArrowRight size={14} /></a>
    </div>
  </section>;
}

export function HalloweenTrialOffer({ fullPrice }: { fullPrice: number }) {
  return <section id="prueba-gratis" className={styles.trialSection}>
    <HalloweenDecor kind="web" className={styles.offerWeb} />
    <div className={styles.trialInner}>
      <div className={styles.trialCopy}>
        <span className={styles.eyebrow}><HalloweenDecor kind="candy" /> EL TRATO MÁS DULCE PARA TU TALLER</span>
        <h2>Todo el poder de Full.<br /><span>Cero sustos al empezar.</span></h2>
        <p>Este Halloween, lo que da miedo es seguir trabajando a ciegas. Prueba una operación conectada con tus clientes, tus motos y tu equipo. El primer paso va por nuestra cuenta.</p>
        <ul>
          <li><Check /> Clientes, motos, órdenes e historial conectados.</li>
          <li><Check /> Inventario, ventas, caja y finanzas en un solo lugar.</li>
          <li><Check /> Agenda, técnicos y permisos del plan Full.</li>
        </ul>
        <div className={styles.trialPromise}><CreditCard size={20} /><p><strong>Sin tarjeta. Sin cobros automáticos.</strong><br />Al contratar un plan, conservas toda tu información.</p></div>
        <div className={styles.candyLine} aria-hidden="true"><HalloweenDecor kind="pumpkin" /><span /><HalloweenDecor kind="candy" /><HalloweenDecor kind="skull" /></div>
      </div>
      <div className={styles.offerTicket}>
        <div className={styles.ticketHeader}><span>TU PASE A FULL TALLER</span><HalloweenDecor kind="pumpkin" /></div>
        <p className={styles.ticketLabel}>15 DÍAS GRATIS</p>
        <p className={styles.ticketPrice}>$0<span>para empezar</span></p>
        <p className={styles.ticketDescription}>Tu taller de verdad.<br />Nuestro plan más completo.</p>
        <div className={styles.ticketPerforation} aria-hidden="true" />
        <p className={styles.ticketTerms}>Después, tú decides. Full desde <strong>{fullPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}/mes</strong> o elige otro plan. No se cobra automáticamente.</p>
        <Link href="/prueba-gratis" className={styles.ticketButton}>Activar mis 15 días gratis <ArrowRight size={18} /></Link>
        <a href="#planes" className={styles.ticketCompare}>Comparar los planes para después</a>
      </div>
    </div>
  </section>;
}

export function HalloweenClosing() {
  return <section className={styles.closing}>
    <HalloweenDecor kind="web" className={styles.webLeft} />
    <HalloweenDecor kind="pumpkin" className={styles.closingPumpkin} />
    <HalloweenDecor kind="coffin" className={styles.closingCoffin} />
    <HalloweenDecor kind="candy" className={styles.closingCandy} />
    <span className={styles.eyebrow}>QUE LOS SUSTOS SE QUEDEN EN HALLOWEEN</span>
    <h2>Tu taller merece<br /><span>un nuevo comienzo.</span></h2>
    <p>15 días para descubrir otra forma de trabajar.<br />Full Taller. Con tu operación real. Por $0.</p>
    <Link href="/prueba-gratis" className={styles.primaryButton}>Darle vida a mi taller <ArrowRight size={19} /></Link>
    <span className={styles.closingNote}>Sin tarjeta · Sin cobros automáticos · Tú decides cómo seguir</span>
  </section>;
}

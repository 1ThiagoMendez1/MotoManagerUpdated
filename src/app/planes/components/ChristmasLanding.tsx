'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import localFont from 'next/font/local';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bike, Check, CheckCheck, ChevronRight, ClipboardList, Clock3, Gift, House, Menu, MessageCircle, Package, Search, ShieldCheck, Snowflake, Sparkles, Star, Users, Wallet, Wrench, X } from 'lucide-react';
import type { PublicWorkshop } from '@/actions/public-workshops';
import { getWhatsAppLink } from '@/lib/utils';
import { LandingDemoSection } from './LandingDemoSection';
import { LandingPricing } from './LandingPricing';
import { FAQS } from './LandingTestimonialsAndFAQ';
import styles from './christmas-reference.module.css';

const displayFont = localFont({ src: '../../../../public/fonts/anton-latin.ttf', display: 'swap', variable: '--font-landing-display', weight: '400' });
const ASSETS = '/campaigns/navidad-2026/';
const NAV = [['demo', 'Demo'], ['funciones', 'Funciones'], ['como-funciona', 'Cómo funciona'], ['planes', 'Precios'], ['workshops', 'Talleres'], ['faq', 'Preguntas']];
const salesLink = getWhatsAppLink('573232663710', 'Hola, equipo MotoManager. Quiero organizar las órdenes, el inventario y las ventas de mi taller de motos. ¿Me ayudan a activar los 30 días gratis de Full y a elegir el plan adecuado para mi taller?');

function Eyebrow({ children }: { children: ReactNode }) { return <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true"/>{children}</span>; }
function TrialLink({ href, id, children = 'Crear mi taller gratis', secondary = false }: { href: string; id: string; children?: ReactNode; secondary?: boolean }) {
  return <Link href={href} data-analytics-id={id} className={`${styles.button} ${secondary ? styles.secondary : styles.primary}`}>{children}<ArrowRight size={18} aria-hidden="true"/></Link>;
}
function Brand() { return <Link href="/" className={styles.brand} aria-label="MotoManager, inicio"><span><Image src="/logo.png" alt="" width={43} height={32}/><Image src="/campaigns/navidad-gorro-logo.svg" alt="" width={25} height={24} className={styles.hat}/></span>MotoManager</Link>; }

function ChristmasCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Date.parse('2026-12-24T18:00:00-05:00') - Date.now()));
    update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer);
  }, []);
  if (remaining === 0) return <p className={styles.holidayWish}>¡Feliz Navidad, taller!</p>;
  const seconds = Math.floor((remaining || 0) / 1000);
  return <div className={styles.countdown} aria-label="Cuenta regresiva para Nochebuena, hora de Colombia">
    <p>Faltan para Nochebuena</p><div>{[[Math.floor(seconds / 86400), 'días'], [Math.floor(seconds / 3600) % 24, 'horas'], [Math.floor(seconds / 60) % 60, 'min'], [seconds % 60, 'seg']].map(([value, label]) => <span key={label}><b>{remaining === null ? '—' : String(value).padStart(2, '0')}</b><small>{label}</small></span>)}</div>
  </div>;
}

function PortalShowcase() {
  const [screen, setScreen] = useState(0);
  return <div className={styles.portalStage}>
    <div className={styles.phoneGlow} aria-hidden="true"/>
    <span className={styles.floatingNote}><MessageCircle size={23}/><span>Tu cliente, siempre informado<small>por WhatsApp y su portal</small></span></span>
    <div className={styles.phone}><div className={styles.phoneScreen}>
      <div className={styles.phoneStatus}><span>9:41</span><span className={styles.island}/><span>● ▰</span></div>
      <div className={styles.phoneContent} key={screen}>
        <p className={styles.phoneBrand}>MotoManager <span>/ Mi garaje</span></p>
        {screen === 0 ? <>
          <div className={styles.notification}><MessageCircle size={24}/><div><b>MotoManager <small>ahora</small></b><p>Hola, Laura 👋 Tu cotización en Taller Ejemplo está lista. Consulta la orden WO-1042 y revisa los repuestos y servicios desde tu portal.</p></div></div>
          <span className={styles.phoneTag}>CUENTA VINCULADA A TU TALLER</span><h3>¡Hola, Laura!</h3><p>Tus motocicletas, servicios y próximas visitas. Sin buscar papeles ni chats antiguos.</p>
          <div className={styles.phoneStats}><div><b>1</b>Moto vinculada</div><div><b>1</b>Taller asociado</div></div>
          <h4>Mis motocicletas</h4><div className={styles.phoneCard}><Bike size={36}/><span className={styles.plate}>FZA23C</span><h4>Yamaha FZ 2.0</h4><p>Taller Ejemplo</p><button type="button" onClick={() => setScreen(1)}>Ver historial y órdenes <ChevronRight size={14}/></button></div>
        </> : screen === 1 ? <>
          <span className={styles.phoneTag}>PORTAL DEL CLIENTE</span><h3>Tu moto, al día.</h3><p>Bienvenida, Laura Gómez</p>
          <div className={styles.phoneCard}><Bike size={34}/><h4>Yamaha FZ 2.0</h4><span className={styles.plate}>FZA23C</span><p>Taller Ejemplo · Laura Gómez</p></div>
          <h4>Cotizaciones y órdenes</h4><div className={styles.phoneCard}><div className={styles.cardRow}><b>Orden #1042</b><span className={styles.badge}>Por aprobar</span></div><p>Diagnóstico general</p><p>Diagnosticando · Técnico: Camilo R.</p><button type="button" onClick={() => setScreen(2)}>Ver cotización completa <ChevronRight size={14}/></button></div>
          <p className={styles.phoneHint}><ShieldCheck size={14}/> La información de su moto, en un solo lugar.</p>
        </> : <>
          <span className={styles.phoneTag}>COTIZACIÓN DE SERVICIO</span><h3>Todo claro.<br/>Antes de reparar.</h3><p>Taller Ejemplo · Orden #1042</p><span className={styles.badge}>Cotización por aprobar</span>
          <div className={styles.phoneCard}><h4>Repuestos e insumos</h4><div className={styles.cardRow}><span>Aceite 4T 10W40<small>Cantidad: 1</small></span><b>$38.000</b></div><h4>Mano de obra</h4><div className={styles.cardRow}><span>Cambio de aceite</span><b>$25.000</b></div><hr/><div className={styles.cardRow}><b>Total estimado</b><strong>$63.000</strong></div></div>
          <div className={styles.quoteActions}><span><Check size={14}/> Aprobar</span><span>Rechazar</span></div><p className={styles.phoneHint}>Vista de ejemplo. Explora estas acciones en la demo.</p>
        </>}
      </div><div className={styles.homeIndicator}/>
    </div></div>
    <p className={styles.demoCaption}>Demostración · Taller y datos ficticios</p>
    <div className={styles.screenTabs} role="group" aria-label="Ver el recorrido del cliente">{['WhatsApp', 'Mi garaje', 'Cotización'].map((label, i) => <button key={label} type="button" aria-pressed={screen === i} onClick={() => setScreen(i)}>{label}</button>)}</div>
  </div>;
}

const START_STEPS = [
  { title: 'Crea tu taller', body: 'El nombre de tu taller y tu WhatsApp. Recibe tu código y entra.', icon: House },
  { title: 'Registra una moto', body: 'Usa los datos de un cliente de tu propio taller.', icon: Bike },
  { title: 'Abre tu primera orden', body: 'Lleva el diagnóstico, los servicios y los repuestos.', icon: ClipboardList },
];
function FirstSteps({ trialHref }: { trialHref: string }) {
  const [active, setActive] = useState(0);
  const Icon = START_STEPS[active].icon;
  return <section className={styles.section} id="como-empezar"><div className={`${styles.wrap} ${styles.split}`}>
    <div><Eyebrow>Conoce el sistema · 3 pasos</Eyebrow><h2 className={styles.heading}>Tu primera orden<br/><em>empieza aquí.</em></h2><p className={styles.copy}>Del registro a tu primera moto en el taller. Sin tarjeta, con tus propios datos y 30 días de Full para probarlo.</p><div className={styles.steps}>{START_STEPS.map((step, i) => <button key={step.title} type="button" aria-pressed={active === i} onClick={() => setActive(i)}><span>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div><ChevronRight size={20}/></button>)}</div><TrialLink href={trialHref} id="steps_trial"/></div>
    <div className={styles.stepPreview} aria-live="polite"><div className={styles.previewTop}><span><i/> MotoManager</span><small>VISTA DE EJEMPLO</small></div><div key={active} className={styles.previewBody}><Icon size={38}/><p className={styles.eyebrow}>PASO 0{active + 1}</p><h3>{START_STEPS[active].title}</h3>{active === 0 ? <><p className={styles.badge}>30 días de Full · $0</p><div className={styles.fakeField}><small>Nombre del taller</small>Taller Ejemplo</div><div className={styles.fakeField}><small>Tu número de WhatsApp</small>+57 300 123 4567</div><TrialLink href={trialHref} id="steps_preview_trial">Recibir mi código</TrialLink><p className={styles.demoCaption}>El código se solicita al crear tu cuenta.</p></> : active === 1 ? <><span className={styles.bigPlate}>FZA 23C<small>COLOMBIA</small></span><div className={styles.previewDetails}><p>Marca <b>Yamaha</b></p><p>Modelo <b>FZ 2.0</b></p><p>Propietaria <b>Laura Gómez</b></p></div></> : <><p className={styles.badge}>Diagnosticando</p><h4>Orden #1042 · Diagnóstico general</h4><p>Yamaha FZ 2.0 · Laura Gómez</p><div className={styles.previewDetails}><p>Servicio <b>Revisión de ingreso</b></p><p>Repuesto <b>Aceite 4T 10W40</b></p><p>Cotización <b>Pendiente</b></p></div><a href="#demo" className={`${styles.button} ${styles.secondary}`}>Probar en la demo <ArrowRight size={16}/></a></>}</div></div>
  </div></section>;
}

const MODULES = [
  { title: 'Órdenes de trabajo', body: 'Desde el ingreso hasta la entrega: estados, diagnóstico, técnico asignado e historial del servicio.', tag: 'Trazabilidad del trabajo', image: 'mecanico.jpg', icon: ClipboardList },
  { title: 'Clientes y motocicletas', body: 'Relaciona cada moto con su propietario. Encuentra sus servicios anteriores cuando regresa al taller.', tag: 'Historial conectado', image: 'motor-bn.jpg', icon: Bike },
  { title: 'Inventario y repuestos', body: 'Organiza productos, existencias y movimientos. Prepara cada trabajo con claridad.', tag: 'Control de existencias', image: 'motor.jpg', icon: Package },
  { title: 'Ventas y caja', body: 'Registra ventas de productos y servicios y consulta la operación comercial del taller.', tag: 'Operación comercial', image: 'reparacion.jpg', icon: Wallet },
  { title: 'Agenda y equipo', body: 'Gestiona citas y organiza el trabajo de tus técnicos con permisos según tu plan.', tag: 'Disponible según plan', image: 'herramientas.jpg', icon: Users },
  { title: 'Avisos por WhatsApp', body: 'Comunica avances a tus clientes con las notificaciones disponibles y la integración configurada.', tag: 'Cuotas según plan', image: 'escape.jpg', icon: MessageCircle },
];
function Modules() {
  const [active, setActive] = useState(0);
  return <section id="funciones" className={`${styles.section} ${styles.modules}`}><div className={`${styles.wrap} ${styles.center}`}><Eyebrow>Una operación conectada</Eyebrow><h2 className={styles.heading}>Lo que sucede en tu taller,<br/><em>en un solo sistema.</em></h2><p className={styles.copy}>Tu operación deja de estar repartida entre papeles, hojas de cálculo y mensajes. Todo conectado para atender mejor cada moto.</p></div>
    <div className={styles.carousel} aria-label="Funciones de MotoManager">{MODULES.map((module, i) => { const offset = (i - active + 9) % 6 - 3; const Icon = module.icon; return <button key={module.title} type="button" tabIndex={i === active ? 0 : -1} aria-hidden={Math.abs(offset) > 2} aria-label={module.title} aria-pressed={i === active} className={styles.moduleCard} data-active={i === active} style={{ '--offset': offset, '--distance': Math.abs(offset) } as CSSProperties} onClick={() => setActive(i)}><Image src={ASSETS + module.image} alt="" fill sizes="(max-width: 600px) 80vw, 400px"/><span className={styles.moduleNumber}>0{i + 1}</span><div><Icon size={25}/><h3>{module.title}</h3><p>{module.body}</p><small>{module.tag}</small></div></button>; })}</div>
    <div className={styles.carouselControls}><button type="button" aria-label="Módulo anterior" onClick={() => setActive((active + 5) % 6)}><ArrowLeft size={18}/></button>{MODULES.map((m, i) => <button key={m.title} className={styles.dot} type="button" aria-label={m.title} aria-pressed={active === i} onClick={() => setActive(i)}/>)}<button type="button" aria-label="Módulo siguiente" onClick={() => setActive((active + 1) % 6)}><ArrowRight size={18}/></button></div><p className={`${styles.demoCaption} ${styles.wrap}`}>La disponibilidad y los límites de cada módulo dependen del plan. Consulta la comparación antes de contratar.</p>
  </section>;
}

function BeforeAfter() {
  const [after, setAfter] = useState(true);
  const items = [['Chat de WhatsApp', '¿En qué quedó esa moto?', 'Buscar en chats. Volver a preguntar.', 'Consulta la orden, el técnico y el estado en un mismo lugar.', ClipboardList], ['Libreta', '¿Cuánto queda de ese repuesto?', 'Contar en bodega. “Creo que hay dos”.', 'Revisa las existencias y los movimientos del inventario.', Package], ['Archivos separados', '¿Quién tiene los datos del cliente?', 'La placa en un archivo, el celular en otro.', 'Mantén cliente, motocicleta e historial relacionados.', Users]] as const;
  return <section id="why" className={styles.section}><div className={`${styles.wrap} ${styles.center}`}><Eyebrow>El costo del desorden</Eyebrow><h2 className={styles.heading}>Tu tiempo vale más que<br/><em>buscar información.</em></h2><p className={styles.copy}>Las mismas tres preguntas de todos los días. Mira cómo cambia la forma de encontrar la respuesta.</p><div className={styles.toggle} role="group" aria-label="Comparar antes y con MotoManager"><button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>Antes</button><button type="button" aria-pressed={after} onClick={() => setAfter(true)}>Con MotoManager</button></div><div className={styles.comparison}>{items.map(([label, title, before, solution, Icon], i) => <article key={title} data-after={after}><span className={styles.eyebrow}>{after ? 'CON MOTOMANAGER' : label} · 0{i + 1}</span><Icon size={30}/><h3>{title}</h3><p>{after ? solution : before}</p><span className={styles.comparisonLine}>{after ? <CheckCheck size={18}/> : <Clock3 size={18}/>} {after ? 'Información conectada' : 'Tiempo buscando'}</span></article>)}</div></div></section>;
}

function Directory({ workshops }: { workshops: PublicWorkshop[] }) {
  const [search, setSearch] = useState(''), [city, setCity] = useState(''), [showAll, setShowAll] = useState(false);
  const cities = useMemo(() => [...new Set(workshops.map(w => w.city?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'es')), [workshops]);
  const list = useMemo(() => workshops.filter(w => (!city || w.city?.trim() === city) && [w.name, w.city, w.address].some(value => (value || '').toLocaleLowerCase('es-CO').includes(search.trim().toLocaleLowerCase('es-CO')))).sort((a, b) => Number(b.review_count || 0) - Number(a.review_count || 0) || a.name.localeCompare(b.name, 'es')), [workshops, search, city]);
  const visible = showAll || search || city ? list : list.slice(0, 6);
  return <section id="workshops" className={styles.section}><div className={styles.wrap}><div className={styles.center}><Eyebrow>Comunidad MotoManager · {workshops.length} talleres</Eyebrow><h2 className={styles.heading}>Talleres reales.<br/><em>Cerca de ti.</em></h2><p className={styles.copy}>Encuentra un taller de la comunidad por su nombre o ciudad. Su ubicación, sus canales de atención y sus reseñas verificadas, cuando estén publicados.</p></div>
    <div className={styles.directorySearch}><label htmlFor="christmas-workshop-search">Buscar taller</label><div><Search size={20}/><input id="christmas-workshop-search" type="search" placeholder="Nombre, ciudad o dirección" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
    <div className={styles.cityFilters} role="group" aria-label="Filtrar talleres por ciudad"><button type="button" aria-pressed={!city} onClick={() => setCity('')}>Todas las ciudades</button>{cities.map(c => <button key={c} type="button" aria-pressed={city === c} onClick={() => setCity(c)}>{c}<span>{workshops.filter(w => w.city?.trim() === c).length}</span></button>)}</div>
    <div className={styles.directoryCount}><span>{list.length} talleres encontrados</span><span>DESTACADOS PRIMERO</span></div><div className={styles.workshopGrid}>{visible.map(w => <article key={w.id} className={styles.workshopCard}><span className={styles.workshopInitial}>{w.name.trim().slice(0, 2).toLocaleUpperCase('es-CO')}</span><div><h3><Link href={'/talleres/' + encodeURIComponent(w.slug)}>{w.name}</Link></h3><p>{[w.city, w.address].filter(Boolean).join(' · ') || 'Ubicación aún no publicada'}</p>{Number(w.review_count || 0) > 0 ? <p className={styles.workshopRating}><Star size={13} fill="currentColor"/>{Number(w.average_rating || 0).toFixed(1)} · {w.review_count} {w.review_count === 1 ? 'reseña verificada' : 'reseñas verificadas'}</p> : <p className={styles.demoCaption}>Sin reseñas verificadas todavía</p>}<div className={styles.workshopLinks}><Link href={'/talleres/' + encodeURIComponent(w.slug)}>Ver taller <ArrowUpRight size={14}/></Link>{w.phone && <a href={getWhatsAppLink(w.phone, 'Hola ' + w.name + ', los encontré en MotoManager y quisiera consultar sobre sus servicios.')} target="_blank" rel="noopener noreferrer">Contactar <MessageCircle size={14}/></a>}</div></div></article>)}</div>{!visible.length && <p className={styles.emptyState}>{workshops.length ? 'No encontramos talleres con esa búsqueda. Prueba otro nombre o ciudad.' : 'Los talleres aparecerán aquí cuando haya perfiles públicos disponibles.'}</p>}
    {!showAll && !search && !city && list.length > 6 && <div className={styles.center}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setShowAll(true)}>Ver todos los talleres <ArrowDown size={17}/></button></div>}<p className={styles.directoryNote}><ShieldCheck size={16}/> Cada ficha proviene de los datos publicados por el taller. Las valoraciones corresponden a reseñas verificadas.</p>
  </div></section>;
}

export function ChristmasLanding({ plans, features, user, workshops, onSelectPlan, onScrollToPlanes }: { plans: any[]; features: any[]; user: any; workshops: PublicWorkshop[]; onSelectPlan: (plan: any) => void; onScrollToPlanes: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [snow, setSnow] = useState(true), [menu, setMenu] = useState(false), [gift, setGift] = useState(false), [activeSection, setActiveSection] = useState('');
  const trialHref = user ? '/dashboard/subscription' : '/prueba-gratis';
  const fullPrice = Number(plans.find(p => p.id === 'full')?.price || 119900).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  useEffect(() => {
    try { setSnow(localStorage.getItem('mm:landing:snow') !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches); } catch {}
    const node = root.current; if (!node) return;
    const container = node.closest('.planes-root-override');
    const target = container || window;
    let frame = 0;
    const update = () => { if (frame) return; frame = requestAnimationFrame(() => { const top = container?.scrollTop ?? window.scrollY; const max = container ? container.scrollHeight - container.clientHeight : document.documentElement.scrollHeight - innerHeight; node.dataset.scrolled = String(top > 35); node.style.setProperty('--scroll-progress', String(max > 0 ? top / max : 0)); frame = 0; }); };
    target.addEventListener('scroll', update, { passive: true }); update();
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting && NAV.some(([id]) => id === entry.target.id)) setActiveSection(entry.target.id); }); }, { root: container, rootMargin: '-15% 0px -65% 0px' });
    NAV.forEach(([id]) => { const section = node.querySelector('#' + id); if (section) observer.observe(section); });
    return () => { target.removeEventListener('scroll', update); cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  useEffect(() => { if (!menu) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [menu]);
  const toggleSnow = () => setSnow(current => { try { localStorage.setItem('mm:landing:snow', current ? 'off' : 'on'); } catch {} return !current; });
  return <div ref={root} className={`${displayFont.variable} ${styles.edition}`} data-campaign="navidad-2026-v3" data-snow={snow}>
    <a className={styles.skipLink} href="#inicio">Ir al contenido</a>
    <div className={styles.snow} aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 9) % 100}%`, width: `${2 + i % 3}px`, height: `${2 + i % 3}px`, animationDelay: `${-i * 0.77}s`, animationDuration: `${12 + i % 11}s`, opacity: 0.25 + (i % 5) * 0.12 }}/>)}</div>
    <header className={styles.nav}><div className={styles.navInner}><Brand/><nav className={styles.navLinks} aria-label="Principal">{NAV.map(([id, label]) => <a key={id} href={'#' + id} aria-current={activeSection === id ? 'location' : undefined}>{label}</a>)}</nav><div className={styles.navActions}><Link href="/clientes" className={styles.garageLink}><House size={14}/> Mi garaje</Link><Link href={user ? '/dashboard' : '/login'} className={styles.loginLink}>{user ? 'Mi taller' : 'Iniciar sesión'}</Link><button type="button" className={styles.snowButton} onClick={toggleSnow} aria-label={snow ? 'Quitar nieve' : 'Mostrar nieve'} aria-pressed={snow}><Snowflake size={18}/></button><TrialLink href={trialHref} id="nav_trial">{user ? 'Mi plan' : '30 días gratis'}</TrialLink><button type="button" className={styles.menuButton} aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="christmas-mobile-menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div><span className={styles.navProgress}/></div></header>
    {menu && <nav id="christmas-mobile-menu" className={styles.mobileMenu} aria-label="Navegación móvil">{NAV.map(([id, label]) => <a key={id} href={'#' + id} onClick={() => setMenu(false)}>{label}<ArrowUpRight size={23}/></a>)}<div><Link href="/clientes">Mi garaje</Link><Link href={user ? '/dashboard' : '/login'}>{user ? 'Mi taller' : 'Iniciar sesión'}</Link></div></nav>}
    <main>
      <section id="hero" className={styles.hero} aria-labelledby="christmas-title"><div className={styles.heroBackground} aria-hidden="true"/><div className={styles.lightWire} aria-hidden="true"><svg viewBox="0 0 1440 55" preserveAspectRatio="none"><path d="M0 6 Q90 63 180 6 Q270 63 360 6 Q450 63 540 6 Q630 63 720 6 Q810 63 900 6 Q990 63 1080 6 Q1170 63 1260 6 Q1350 63 1440 6"/></svg>{Array.from({ length: 21 }, (_, i) => <span key={i} style={{ left: `${2 + i * 4.8}%`, top: `${9 + Math.sin(i * 1.7) * 8}px`, '--bulb': ['#ef4444', '#fbbf24', '#22c55e', '#38bdf8'][i % 4], animationDelay: `${-i * 0.35}s` } as CSSProperties}/>)}</div>
        <span id="inicio"/><div className={`${styles.wrap} ${styles.heroGrid}`}><div className={styles.heroCopy}><Link href={trialHref} className={styles.ribbon} data-analytics-id="ribbon_trial"><Sparkles size={13}/><span>Especial de Navidad · 30 días de Full sin pagar</span><b>Activar prueba</b></Link><Eyebrow>Navidad 2026 · Para talleres de Colombia</Eyebrow><p className={styles.holidayLabel}>Esta Navidad, atiende con más tranquilidad.</p><h1 id="christmas-title" className={styles.title}>Menos “¿cómo va<br className={styles.desktopBreak}/> mi moto?”.<br/><em>Más control de tu taller.</em></h1><p className={styles.heroDescription}>Tu cliente consulta el estado de su moto desde su portal. Tú organizas <strong>órdenes, repuestos y ventas</strong> en un solo lugar. Pruébalo con tu taller real durante 30 días.</p><div className={styles.actions}><TrialLink href={trialHref} id="hero_trial"/><a href="#demo" data-analytics-id="hero_demo" className={`${styles.button} ${styles.secondary}`}>Ver cómo funciona</a></div><ChristmasCountdown/></div>
          <div className={styles.heroArt}><div className={styles.bikeFrame}><Image src={ASSETS + 'moto-navidad.jpg'} alt="Motocicleta decorada con luces cálidas de Navidad" fill priority sizes="(max-width: 767px) 76vw, 430px"/><span>El regalo es trabajar con tranquilidad.</span></div><span className={styles.christmasBadge}><i/><span>Especial de Navidad<small>Hoy pagas $0</small></span></span><div className={styles.giftCard}><span className={styles.giftCardBrand}><Image src="/logo.png" width={27} height={20} alt=""/> MotoManager</span><small>Tarjeta de regalo</small><strong>30 DÍAS</strong><b>de Full gratis para tu taller</b><div><span>NAVIDAD 2026</span><span>SIN TARJETA</span></div><i aria-hidden="true"/></div></div>
          <div className={styles.assurances}><span><Check size={13}/>Sin tarjeta</span><span><Check size={13}/>Sin cobros automáticos</span><span>Full durante 30 días</span><a href="#portal">Desliza <ArrowDown size={14}/></a></div>
        </div>
      </section>
      <div className={styles.marquee} aria-hidden="true"><div>{[0, 1].map(i => <span key={i}>Órdenes de trabajo <i>✦</i> Clientes y motos <i>✦</i> Inventario y repuestos <i>✦</i> Ventas y caja <i>✦</i> Portal del cliente <i>✦</i> </span>)}</div><div>{[0, 1].map(i => <span key={i}>Feliz Navidad · 30 días gratis · Prueba sin tarjeta · Tú decides después · </span>)}</div></div>
      <section id="portal" className={styles.section}><div className={`${styles.wrap} ${styles.split}`}><div><Eyebrow>Mi garaje · Portal del cliente</Eyebrow><h2 className={styles.heading}>Tu cliente ya<br/>no pregunta.<br/><em>Lo consulta.</em></h2><p className={styles.copy}>Cuando la cotización está lista, tu cliente recibe el aviso disponible por WhatsApp. Desde su portal revisa los repuestos, la solución propuesta y aprueba o rechaza la cotización.</p><Link href="/clientes" className={`${styles.button} ${styles.secondary}`}>Soy cliente de un taller · Mi garaje <ArrowUpRight size={17}/></Link><p className={styles.smallPrint}>Los avisos requieren la integración de WhatsApp configurada.</p></div><PortalShowcase/></div></section>
      <FirstSteps trialHref={trialHref}/>
      <LandingDemoSection christmas className={styles.demoSkin}/>
      <section id="prueba-gratis" className={`${styles.section} ${styles.giftSection}`}><div className={`${styles.wrap} ${styles.split}`}><div><Eyebrow>Especial de Navidad · Plan Full</Eyebrow><h2 className={styles.heading}>El mejor regalo<br/>para tu taller es<br/><em>tener todo bajo control.</em></h2><p className={styles.copy}>Comprueba durante 30 días cómo se siente trabajar con la información de tu negocio conectada.</p><ul className={styles.checklist}>{['Clientes, motos y órdenes en un mismo sistema', 'Inventario, ventas, finanzas y equipo', 'Tus propios datos durante la prueba'].map(item => <li key={item}><Check size={17}/>{item}</li>)}</ul><TrialLink href={trialHref} id="offer_trial"/><p className={styles.smallPrint}>Después eliges: Full desde {fullPrice}/mes, otro plan o no continuar.</p></div><div className={styles.presentStage}><button type="button" className={styles.present} aria-label={gift ? 'Cerrar mi regalo de Navidad' : 'Abrir mi regalo de Navidad'} aria-expanded={gift} onClick={() => setGift(!gift)} data-open={gift}><span className={styles.presentLid}><Gift size={75}/></span><span className={styles.presentBox}/><span className={styles.presentTicket}><small>TU REGALO · ACTIVA FULL</small><strong>30 DÍAS</strong><b>GRATIS</b><span>Sin tarjeta · Hoy pagas $0</span></span></button><p>{gift ? 'Tu taller, con Full por 30 días. Actívalo cuando quieras.' : 'Toca el regalo para abrirlo'}</p></div></div></section>
      <BeforeAfter/><Modules/>
      <section id="galeria" className={`${styles.section} ${styles.gallery}`}><div className={`${styles.wrap} ${styles.galleryHeader}`}><h2 className={styles.heading}>Hecho para<br/><em>el taller.</em></h2><p className={styles.copy}>Una plataforma para conectar el recorrido de la moto, desde la recepción hasta la entrega y su próxima visita.</p></div><div className={styles.galleryGrid}>{[['mecanico.jpg', 'Recepción'], ['motor.jpg', 'Diagnóstico'], ['motor-bn.jpg', 'Repuestos'], ['escape.jpg', 'Entrega']].map(([image, title], i) => <figure key={title}><Image src={ASSETS + image} alt={['Mecánico trabajando en una motocicleta', 'Detalle de un motor de motocicleta', 'Repuestos de motocicleta en el taller', 'Trabajo de ajuste y mantenimiento'][i]} fill sizes="(max-width: 600px) 50vw, 25vw"/><figcaption>0{i + 1} · {title}</figcaption></figure>)}</div></section>
      <section id="como-funciona" className={styles.section}><div className={`${styles.wrap} ${styles.split}`}><div><Eyebrow>Del ingreso a la entrega</Eyebrow><h2 className={styles.heading}>Menos información<br/>dispersa.<br/><em>Más continuidad.</em></h2><p className={styles.copy}>Un flujo pensado para las tareas que un taller repite todos los días.</p><a href="#demo" className={`${styles.button} ${styles.secondary}`}>Conoce el recorrido <ArrowRight size={18}/></a></div><ol className={styles.workflow}>{[['Recepción', 'Conoce al cliente y su moto', 'Registra la información importante desde el ingreso.'], ['Gestión', 'Abre y sigue la orden', 'Organiza el diagnóstico, el estado y el técnico responsable.'], ['Operación', 'Controla lo que utilizas', 'Consulta inventario, repuestos y ventas desde el taller.'], ['Continuidad', 'Conserva el historial', 'Cuando la moto regresa, su información ya está registrada.']].map(([stage, title, text], i) => <li key={stage}><span>0{i + 1}</span><div><small>{stage}</small><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>
      <LandingPricing plans={plans} features={features} onSelectPlan={onSelectPlan} onScrollToPlanes={onScrollToPlanes} christmas className={styles.pricingSkin}/>
      <Directory workshops={workshops}/>
      <section id="faq" className={styles.section}><div className={`${styles.wrap} ${styles.faqGrid}`}><div><Eyebrow>Información clara</Eyebrow><h2 className={styles.heading}>Antes de elegir,<br/><em>resuelve tus dudas.</em></h2><p className={styles.copy}>Explora el sistema por dentro y resuelve tus dudas antes de elegir un plan.</p><a href="#demo" className={styles.textLink}>Ir a la demo <ArrowRight size={16}/></a></div><div className={styles.faqList}>{FAQS.map((faq, i) => <details key={faq.question} open={i === 0}><summary>{faq.question}<span>+</span></summary><p>{faq.answer}</p></details>)}</div></div></section>
      <section id="closing" className={`${styles.section} ${styles.closing}`}><div className={`${styles.wrap} ${styles.center}`}><Eyebrow>Que diciembre te encuentre preparado</Eyebrow><h2 className={styles.heading}>Las motos seguirán llegando.<br/><em>Que tu taller tenga todo en orden.</em></h2><p className={styles.holidayWish}>¡Feliz Navidad, taller!</p><p className={styles.copy}>Conoce MotoManager durante 30 días sin pagar. Descubre si hace más sencillo tu trabajo.</p><div className={styles.actions}><TrialLink href={trialHref} id="closing_trial"/><a href={salesLink} target="_blank" rel="noopener noreferrer" className={`${styles.button} ${styles.secondary}`}><MessageCircle size={18}/>Hablemos de tu taller</a></div></div></section>
    </main>
    <footer className={styles.footer}><div className={`${styles.wrap} ${styles.footerGrid}`}><div><Brand/><p>Software de gestión para talleres de motocicletas. Clientes, motos, órdenes y operación comercial conectadas.</p><small>Hecho para talleres de Colombia.</small></div><div><h3>Explorar</h3>{NAV.map(([id, label]) => <a href={'#' + id} key={id}>{label}</a>)}</div><div><h3>Acceso</h3><Link href="/clientes">Soy cliente de un taller · Mi garaje</Link><Link href={user ? '/dashboard' : '/login'}>{user ? 'Ir a mi taller' : 'Iniciar sesión'}</Link><Link href={trialHref}>Probar Full 30 días gratis</Link><h3>Asesoría por WhatsApp</h3><a href={salesLink} target="_blank" rel="noopener noreferrer">+57 323 266 3710 <ArrowUpRight size={14}/></a></div></div><div className={`${styles.wrap} ${styles.footerBottom}`}><p>© 2026 MotoManager · ¡Feliz Navidad y próspero 2027!</p><div><Link href="/privacidad">Política de privacidad</Link><Link href="/eliminacion-de-datos">Eliminación de datos</Link><button type="button" onClick={() => window.dispatchEvent(new Event('mm:marketing-consent-settings'))}>Privacidad publicitaria</button></div></div></footer>
  </div>;
}

'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, X } from 'lucide-react';
import styles from './whatsapp-widget.module.css';

const message = 'Hola, equipo MotoManager. Quiero usar MotoManager en mi taller de motos para organizar órdenes, inventario y ventas. ¿Qué plan me recomiendan y cómo activo los 15 días gratis de Full?';
const contactUrl = 'https://wa.me/573232663710?text=' + encodeURIComponent(message);

export function LandingWhatsAppWidget({ hasMobileDock = false }: { hasMobileDock?: boolean }) {
  const [showInvitation, setShowInvitation] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowInvitation(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <aside aria-label="Asesoría comercial por WhatsApp" className={styles.widget} data-mobile-dock={hasMobileDock}>
      {showInvitation && <div className={styles.invitation}>
        <div className={styles.heading}>
          <span className={styles.brand}><MessageCircle size={17} aria-hidden="true" /> MotoManager <span>· Asesoría</span></span>
          <button type="button" aria-label="Cerrar invitación de WhatsApp" onClick={() => setShowInvitation(false)} className={styles.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.title}>¿MotoManager es para tu taller?</p>
        <p className={styles.description}>Hablemos de lo que necesitas. Te ayudamos a elegir tu plan y empezar con <strong>15 días de Full gratis.</strong></p>
        <a href={contactUrl} target="_blank" rel="noopener noreferrer" data-analytics-id="whatsapp_advice" className={styles.action}>
          Quiero asesoría para mi taller <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>}
      <a href={contactUrl} target="_blank" rel="noopener noreferrer" data-analytics-id="whatsapp_floating" className={styles.launcher} aria-label="Hablemos de tu taller por WhatsApp">
        <span className={styles.icon}><MessageCircle size={26} aria-hidden="true" /></span>
        <span className={styles.launcherCopy}><strong>Hablemos de tu taller</strong><span>Asesoría por WhatsApp</span></span>
        <ArrowUpRight className={styles.arrow} size={19} aria-hidden="true" />
      </a>
    </aside>
  );
}

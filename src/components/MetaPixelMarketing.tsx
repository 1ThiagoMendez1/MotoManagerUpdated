'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { META_PIXEL_CONSENT_KEY } from '@/lib/analytics/metaPixel';

type Choice = 'accepted' | 'rejected' | null;

/** Marketing-only Meta pixel. No browser calls until the visitor opts in. */
export function MetaPixelMarketing() {
  const [consent, setConsent] = useState<Choice>(null);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(META_PIXEL_CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored);
    } else {
      setShowChoices(true);
    }
    const reopen = () => setShowChoices(true);
    window.addEventListener('mm:marketing-consent-settings', reopen);
    return () => window.removeEventListener('mm:marketing-consent-settings', reopen);
  }, []);

  const choose = (choice: Exclude<Choice, null>) => {
    if (choice === 'rejected' && consent === 'accepted') {
      window.fbq?.('consent', 'revoke');
    }
    if (choice === 'accepted' && consent === 'rejected' && window.fbq) {
      window.fbq('consent', 'grant');
      window.fbq('track', 'PageView');
    }
    localStorage.setItem(META_PIXEL_CONSENT_KEY, choice);
    setConsent(choice);
    setShowChoices(false);
  };

  return (
    <>
      {consent === 'accepted' && (
        <Script id="motomanager-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
            n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','1152958704342751');
            fbq('track','PageView');
          `}
        </Script>
      )}
      {showChoices && (
        <section role="dialog" aria-modal="false" aria-label="Preferencias de medición publicitaria"
          className="fixed bottom-4 left-4 right-4 z-[120] mx-auto max-w-lg rounded-2xl border border-white/20 bg-[#111c2e] p-4 text-white shadow-2xl md:left-auto md:right-6">
          <p className="font-semibold">Preferencias de cookies</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            ¿Nos autorizas a usar el píxel de Meta para medir visitas y mejorar los anuncios de MotoManager?
            No es necesario aceptarlo para utilizar el sitio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose('rejected')}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10">Rechazar</button>
            <button type="button" onClick={() => choose('accepted')}
              className="rounded-lg bg-[#ff831b] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-[#ffa149]">Permitir medición</button>
          </div>
        </section>
      )}
    </>
  );
}

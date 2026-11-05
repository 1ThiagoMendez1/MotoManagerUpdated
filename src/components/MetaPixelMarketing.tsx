'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { META_PIXEL_CONSENT_KEY } from '@/lib/analytics/metaPixel';
import { MEASUREMENT_CHANGED } from '@/lib/analytics/web-shared';
import { privacySignal } from '@/lib/analytics/web-consent';

/** Advertising is independent of first-party analytics. The Meta script still
 * loads only on the landing; MeasurementPreferences owns the separate choices. */
export function MetaPixelMarketing({excluded=false}:{excluded?:boolean}) {
  const [consent,setConsent]=useState(false);
  const previous=useRef(false);
  useEffect(()=>{
    const update=()=>{
      let allowed=false;
      try{allowed=!excluded&&!privacySignal()&&localStorage.getItem(META_PIXEL_CONSENT_KEY)==='accepted';}catch{/* Necessary-only mode. */}
      if(window.fbq){window.fbq('consent',allowed?'grant':'revoke');if(allowed&&!previous.current)window.fbq('track','PageView');}
      previous.current=allowed;setConsent(allowed);
    };
    update();window.addEventListener(MEASUREMENT_CHANGED,update);window.addEventListener('storage',update);
    return()=>{window.removeEventListener(MEASUREMENT_CHANGED,update);window.removeEventListener('storage',update);};
  },[excluded]);
  return consent?<Script id="motomanager-meta-pixel" strategy="afterInteractive">{`
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
    n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','1152958704342751');fbq('track','PageView');
  `}</Script>:null;
}

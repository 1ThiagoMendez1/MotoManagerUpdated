'use client';

import { useEffect, useState } from 'react';
import { consentingAnalyticsVisitorSeed } from '@/lib/analytics/web-consent';
import { MEASUREMENT_CHANGED } from '@/lib/analytics/web-shared';

/** Optional, consented correlation only; the account is server-verified. */
export function AnalyticsIdentityField(){
  const [seed,setSeed]=useState('');
  useEffect(()=>{
    const update=()=>setSeed(consentingAnalyticsVisitorSeed()||'');
    update();
    window.addEventListener(MEASUREMENT_CHANGED,update);
    window.addEventListener('storage',update);
    return()=>{
      window.removeEventListener(MEASUREMENT_CHANGED,update);
      window.removeEventListener('storage',update);
    };
  },[]);
  return <input type="hidden" name="analyticsVisitorSeed" value={seed} readOnly />;
}

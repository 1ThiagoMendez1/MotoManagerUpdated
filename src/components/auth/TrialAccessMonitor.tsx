'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TRIAL_REVIEW_PATH } from '@/lib/trial-review';

export function TrialAccessMonitor() {
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let checking = false;
    const controller = new AbortController();
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const response = await fetch('/api/trial-review/status', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (!active) return;
        if (result.paused === true && pathname !== TRIAL_REVIEW_PATH) window.location.replace(TRIAL_REVIEW_PATH);
        if (result.paused === false && pathname === TRIAL_REVIEW_PATH) window.location.replace('/dashboard');
      } catch { /* Retry after focus or at the next interval. */ }
      finally { checking = false; }
    };
    const timer = window.setInterval(check, 15_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    void check();
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [pathname]);
  return null;
}

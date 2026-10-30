'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Gift } from 'lucide-react';

export function TrialBanner({ endDate, canManage }: { endDate: string; canManage: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(endDate) - Date.now()));
  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, Date.parse(endDate) - Date.now());
      setRemaining(previous => { if (previous > 0 && next === 0) router.refresh(); return next; });
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [endDate, router]);
  if (path === '/' || path === '/prueba-gratis' || path === '/login' || path?.startsWith('/admin') || path?.startsWith('/talleres') || path?.startsWith('/clientes')) return null;
  const days = Math.ceil(remaining / 86_400_000);
  return <div className="border-b border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm" role="status">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2"><Gift className="h-4 w-4 shrink-0 text-orange-500" /><span><strong>{days ? `Tu prueba Full: ${days} ${days === 1 ? 'día restante' : 'días restantes'}` : 'Tu prueba Full terminó'}</strong><span className="ml-2 hidden text-muted-foreground sm:inline">Conserva tu información y continúa con un plan.</span></span></p>
      {canManage ? <Link href="/dashboard/subscription" className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-300">{days ? 'Quiero seguir con Full' : 'Elegir mi plan'}<ArrowRight className="h-4 w-4" /></Link> : <span className="text-xs text-muted-foreground">El dueño del taller puede contratar el plan.</span>}
    </div>
  </div>;
}

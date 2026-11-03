'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function CustomerSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button type="button" disabled={busy} onClick={async()=>{
    setBusy(true);
    try {
      await createClient().auth.signOut();
      router.replace('/clientes');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:border-orange-400/40 hover:text-white disabled:opacity-50">
    {busy?<Loader2 size={16} className="animate-spin"/>:<LogOut size={16}/>} Cerrar sesión
  </button>;
}

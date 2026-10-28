'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const NAV = [
  { label:'Funcionalidades', href:'#funciones' },
  { label:'Cómo funciona', href:'#como-funciona' },
  { label:'Planes', href:'#planes' },
  { label:'Preguntas', href:'#faq' },
];

export function LandingNavbar({ user }: { user?: any }) {
  const [open, setOpen] = useState(false);
  const destination = user ? '/dashboard' : '/login';

  return (
    <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#081121]/95 text-white backdrop-blur-xl">
      <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5" aria-label="Navegación principal">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MotoManager - inicio">
          <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/10"><Image src="/logo.png" alt="" fill sizes="44px" className="object-contain p-1" /></span>
          <span className="text-lg font-semibold tracking-[-0.035em]">MotoManager</span>
        </Link>
        <div className="hidden items-center gap-7 lg:flex">
          {NAV.map(item => <a key={item.href} href={item.href} className="text-sm font-medium text-slate-300 transition hover:text-white">{item.label}</a>)}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href={destination} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">{user ? 'Ir al sistema' : 'Ingresar'}</Link>
          <a href="#planes" className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
            Ver planes <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="landing-mobile-menu" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} className="rounded-lg border border-white/15 p-2.5 lg:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div id="landing-mobile-menu" className="border-t border-white/10 bg-[#0b1829] px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">{item.label}</a>)}
            <Link href={destination} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">{user ? 'Ir al sistema' : 'Ingresar'}</Link>
          </div>
        </div>
      )}
    </header>
  );
}

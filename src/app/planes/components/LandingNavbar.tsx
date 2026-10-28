'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Menu, PlayCircle, X } from 'lucide-react';

const NAV = [
  { label: 'Demo en vivo', href: '#demo' },
  { label: 'Funcionalidades', href: '#funciones' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Precios', href: '#planes' },
  { label: 'Preguntas', href: '#faq' },
];

export function LandingNavbar({ user }: { user?: unknown }) {
  const [open, setOpen] = useState(false);
  const destination = user ? '/dashboard' : '/login';

  return (
    <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#060d1b]/95 text-white shadow-lg shadow-black/10 backdrop-blur-xl">
      <nav className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-5" aria-label="Navegación principal">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MotoManager - inicio">
          <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/10">
            <Image src="/logo.png" alt="" fill sizes="44px" className="object-contain p-1" />
          </span>
          <span className="text-lg font-extrabold tracking-[-0.045em]">MotoManager</span>
        </Link>
        <div className="hidden items-center gap-6 lg:flex">
          {NAV.map(item => (
            <a key={item.href} href={item.href} className={'text-sm font-semibold transition hover:text-white ' + (item.href === '#demo' ? 'text-[#ff9e4c]' : 'text-slate-300')}>{item.label}</a>
          ))}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href={destination} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            {user ? 'Ir al sistema' : 'Iniciar sesión'}
          </Link>
          <a href="#demo" className="inline-flex items-center gap-2 rounded-xl bg-[#ff831b] px-5 py-3 text-sm font-extrabold text-[#0a1425] transition hover:bg-[#ffa149]">
            <PlayCircle className="h-4 w-4" /> Probar demo
          </a>
        </div>
        <button
          type="button" onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-controls="landing-mobile-menu" aria-expanded={open}
          className="rounded-lg border border-white/15 p-2.5 text-white lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div id="landing-mobile-menu" className="border-t border-white/10 bg-[#0b1829] px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/10">{item.label}</a>)}
            <Link href={destination} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/10">{user ? 'Ir al sistema' : 'Iniciar sesión'}</Link>
            <a href="#planes" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#347df1] px-4 py-3 text-sm font-extrabold text-white">
              Ver planes <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

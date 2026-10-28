'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#07111f] px-5 py-12 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/10"><Image src="/logo.png" alt="" fill sizes="44px" className="object-contain p-1" /></span>
            MotoManager
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
            Software de gestión para talleres de motocicletas. Clientes, motos, órdenes de trabajo y operación comercial conectadas.
          </p>
          <p className="mt-5 text-xs text-slate-500">Hecho para la operación de talleres en Colombia.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Explorar</h3>
          <div className="mt-4 flex flex-col items-start gap-3 text-sm">
            <a href="#funciones" className="hover:text-white">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
            <a href="#planes" className="hover:text-white">Planes y precios</a>
            <a href="#workshops" className="hover:text-white">Talleres de la comunidad</a>
            <a href="#faq" className="hover:text-white">Preguntas frecuentes</a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Acceso</h3>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Si ya utilizas MotoManager, entra a tu taller con tu cuenta.</p>
          <Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
            Iniciar sesión <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 pt-6 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} MotoManager.</p>
        <p>Información de funcionalidades y planes sujeta a la configuración vigente del servicio.</p>
      </div>
    </footer>
  );
}

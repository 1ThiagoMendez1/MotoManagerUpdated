'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench } from 'lucide-react';

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/30 bg-background/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1 space-y-4">
          <Link href="/planes" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 drop-shadow-md">
              <Image 
                src="/logo.png" 
                alt="MotoManager Logo" 
                fill
                sizes="(max-width: 640px) 48px, 64px"
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            El CRM #1 para talleres de motocicletas en Colombia. Gestión profesional desde $18.900/mes.
          </p>
        </div>

        {/* Product */}
        <div className="space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm uppercase tracking-wide">Producto</h4>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Funcionalidades', href: '#funciones' },
              { label: 'Demo del dashboard', href: '#demo' },
              { label: 'Planes y precios', href: '#planes' },
              { label: 'Preguntas frecuentes', href: '#faq' },
            ].map(l => (
              <li key={l.label}>
                <a href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm uppercase tracking-wide">Legal</h4>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Términos de servicio', href: '#' },
              { label: 'Política de privacidad', href: '#' },
              { label: 'Política de cookies', href: '#' },
            ].map(l => (
              <li key={l.label}>
                <a href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm uppercase tracking-wide">Contacto</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://wa.me/573001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-green-400 transition-colors"
              >
                <span className="text-base">💬</span> WhatsApp soporte
              </a>
            </li>
            <li>
              <a
                href="mailto:soporte@motomanager.com.co"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-base">📧</span> soporte@motomanager.com.co
              </a>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="text-base">📍</span> Colombia
            </li>
          </ul>
          <Link
            href="/login"
            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            → Iniciar sesión en el sistema
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/30 px-4 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/60">
          <p>© {year} MotoManager. Todos los derechos reservados.</p>
          <p>Sistema de gestión para talleres de motocicletas · Colombia</p>
        </div>
      </div>
    </footer>
  );
}

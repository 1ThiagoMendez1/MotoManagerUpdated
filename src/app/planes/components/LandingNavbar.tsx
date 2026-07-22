'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export function LandingNavbar({ user }: { user?: any }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#funciones', label: 'Funciones' },
    { href: '#demo', label: 'Demo' },
    { href: '#workshops', label: 'Talleres' },
    { href: '#planes', label: 'Planes' },
    { href: '#faq', label: 'FAQ' },
  ];

  const scrollTo = (id: string) => {
    setOpen(false);
    const el = document.querySelector(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/" : "/planes"} className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
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

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/30 transition-all"
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-4 px-4 py-2">
              <span className="text-sm text-muted-foreground hidden lg:inline-block">
                {user.email}
              </span>
              <Link
                href="/tenant-select"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ir al panel
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Iniciar sesión
            </Link>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            onClick={() => scrollTo('#planes')}
            className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground px-5 py-2 rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-105"
          >
            Empezar →
          </button>
        </div>

        {/* Mobile buttons */}
        <div className="md:hidden flex items-center gap-1">
          {/* Theme Toggle Mobile */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:text-foreground p-2"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-4 space-y-1">
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-xl transition-all"
            >
              {l.label}
            </button>
          ))}
          <div className="pt-2 border-t border-border/30 space-y-2">
            {user ? (
              <div className="px-4 py-3">
                <p className="text-sm text-muted-foreground mb-2 truncate">{user.email}</p>
                <Link
                  href="/tenant-select"
                  className="block text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-3"
                >
                  Ir al panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link href="/login" className="block px-4 py-3 text-muted-foreground hover:text-foreground transition-colors">
                Iniciar sesión
              </Link>
            )}
            <button
              onClick={() => scrollTo('#planes')}
              className="w-full font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-5 py-3 rounded-xl"
            >
              Ver planes y precios →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

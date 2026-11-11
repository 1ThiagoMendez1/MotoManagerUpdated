'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { WorkshopGarland, WorkshopChristmasBar } from '@/components/seasonal/WorkshopChristmas';
import holidayStyles from '@/components/seasonal/workshop-christmas.module.css';
import { checkIsMainPage } from '@/lib/navigation';

interface LayoutWrapperProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  footer: React.ReactNode;
  workshopSlug?: string | null;
  christmasSeason?: boolean;
}

export function LayoutWrapper({ children, header, sidebar, footer, workshopSlug, christmasSeason = false }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isMainPage = checkIsMainPage(pathname, workshopSlug);
  const [open, setOpen] = useState(false);
  const [showChristmas,setShowChristmas] = useState(true);
  useEffect(()=>{ try { setShowChristmas(localStorage.getItem('motomanager:christmas-decoration')!=='hidden'); } catch {} },[]);
  const toggleChristmas=()=>{ const next=!showChristmas;setShowChristmas(next);try {localStorage.setItem('motomanager:christmas-decoration',next?'visible':'hidden');}catch{} };

  // Cada vez que estamos en la página principal, aseguramos que el estado quede colapsado
  useEffect(() => {
    if (isMainPage) {
      setOpen(false);
    }
  }, [isMainPage]);
  
  // Rutas donde no queremos mostrar el Shell/Header/Footer privado de la aplicación
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register-workshop' || 
    pathname === '/prueba-gratis' ||
    pathname === '/' || 
    pathname === '/change-password' || 
    pathname === '/no-workshop' || 
    pathname === '/revision-prueba' ||
    pathname === '/tenant-select' ||
    pathname.startsWith('/clientes') ||
    pathname.startsWith('/talleres/') ||
    pathname.startsWith('/cotizacion');
  
  if (isPublicRoute) {
    return (
      <main className="relative flex-1 flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex flex-col justify-center w-full">
          {children}
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider className={christmasSeason && showChristmas ? holidayStyles.season : undefined} open={open} onOpenChange={setOpen} defaultOpen={false}>
      {!isMainPage && sidebar}
      <SidebarInset className="flex min-w-0 flex-col w-full bg-background">
        {christmasSeason && showChristmas && <WorkshopGarland/>}
        {header}
        {christmasSeason && <WorkshopChristmasBar enabled={showChristmas} onToggle={toggleChristmas}/>}
        
        <main className="relative min-w-0 max-w-none flex-1 p-3 sm:p-5 md:p-6 flex flex-col w-full">
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-background to-background dark:from-blue-900/10 dark:via-background dark:to-background pointer-events-none" />
          <div className="min-w-0 flex-1 flex flex-col w-full">
            {children}
          </div>
        </main>

        {footer}
      </SidebarInset>
    </SidebarProvider>
  );
}

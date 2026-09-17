'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface LayoutWrapperProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  footer: React.ReactNode;
}

export function LayoutWrapper({ children, header, sidebar, footer }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Rutas donde no queremos mostrar el Shell/Header/Footer privado de la aplicación
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register-workshop' || 
    pathname === '/' || 
    pathname === '/change-password' || 
    pathname === '/no-workshop' || 
    pathname === '/tenant-select' ||
    pathname.startsWith('/clientes') ||
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
    <SidebarProvider defaultOpen={true}>
      {sidebar}
      <SidebarInset className="flex flex-col min-h-screen w-full overflow-x-hidden bg-background">
        {header}
        
        <main className="relative flex-1 p-3 sm:p-5 md:p-6 flex flex-col w-full max-w-[1600px] mx-auto">
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-background to-background dark:from-blue-900/10 dark:via-background dark:to-background pointer-events-none" />
          <div className="flex-1 flex flex-col w-full">
            {children}
          </div>
        </main>

        {footer}
      </SidebarInset>
    </SidebarProvider>
  );
}

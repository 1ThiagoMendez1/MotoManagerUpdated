'use client';

import { usePathname } from 'next/navigation';

interface LayoutWrapperProps {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}

export function LayoutWrapper({ children, header, footer }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Rutas donde no queremos mostrar el Header/Footer de la aplicación
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register-workshop' || 
    pathname === '/' || 
    pathname === '/change-password' || 
    pathname === '/no-workshop' || 
    pathname === '/tenant-select';
  
  return (
    <>
      {!isPublicRoute && header}
      
      <main className={!isPublicRoute ? "relative flex-1 pt-[5.5rem] px-4 md:px-6 lg:px-8 overflow-auto flex flex-col" : "relative flex-1 flex flex-col min-h-screen bg-background"}>
        {!isPublicRoute && (
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-background to-background dark:from-blue-900/10 dark:via-background dark:to-background"></div>
        )}
        
        <div className={!isPublicRoute ? "max-w-7xl mx-auto py-2 md:py-4 flex-1 flex flex-col justify-center w-full" : "flex-1 flex flex-col justify-center w-full"}>
          {children}
        </div>
      </main>

      {!isPublicRoute && footer}
    </>
  );
}

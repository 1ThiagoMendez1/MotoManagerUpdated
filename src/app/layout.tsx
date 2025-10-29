import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Header from '@/components/Header';
import { TenantProvider } from '@/components/TenantContextProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MotoManager CRM',
  description: 'CRM para talleres de motocicletas',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className={cn('font-body antialiased')}>
        <TenantProvider>
          <Header />
          <main className="relative min-h-screen pt-24 px-4 md:px-6 lg:px-8 overflow-auto">
             <div className="fixed inset-0 -z-10">
                 <Image
                     src="https://bxrepsol.s3.eu-west-1.amazonaws.com/static/2022/08/29081253/Todo-lo-que-necesita-tu-garaje-para-que-puedas-trabajar-en-tu-moto-1.jpg"
                     alt="Fondo de la aplicación"
                     fill
                     priority
                     className="object-cover"
                     data-ai-hint="mechanic workshop"
                 />
                 <div className="absolute inset-0 bg-black/80" />
              </div>
              <div className="max-w-7xl mx-auto py-6 md:py-8 lg:py-12">
                  {children}
              </div>
          </main>
          <footer className="bg-black/90 border-t border-white/10 py-6 px-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-wrench h-6 w-6 text-primary">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                  </svg>
                  <span className="text-white font-semibold">MotoManager</span>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-white/60 text-sm">
                    © {new Date().getFullYear()} MotoManager. Todos los derechos reservados.
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Sistema de gestión para talleres de motocicletas
                  </p>
                </div>
              </div>
            </div>
          </footer>
          <Toaster />
        </TenantProvider>
      </body>
    </html>
  );
}

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

            {/* Tira de luces navideñas */}
            <div className="christmas-lights" aria-hidden="true">
              <span className="christmas-lights-bulb christmas-lights-bulb--red" />
              <span className="christmas-lights-bulb christmas-lights-bulb--yellow" />
              <span className="christmas-lights-bulb christmas-lights-bulb--green" />
              <span className="christmas-lights-bulb christmas-lights-bulb--blue" />
              <span className="christmas-lights-bulb christmas-lights-bulb--pink" />
            </div>

            {/* Arbolito navideño en esquina inferior derecha */}
            <div className="christmas-tree" aria-hidden="true">
              🎄
            </div>

            <div className="max-w-7xl mx-auto py-6 md:py-8 lg:py-12">
              {children}
            </div>
          </main>
          <footer className="bg-white/10 backdrop-blur-md border-t border-white/10 py-6 px-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-white/60 text-sm">
                © {new Date().getFullYear()} MotoManager. Todos los derechos reservados.
              </p>
              <p className="text-white/40 text-xs mt-1">
                Sistema de gestión para talleres de motocicletas
              </p>
            </div>
          </footer>
          <Toaster />
        </TenantProvider>
      </body>
    </html>
  );
}

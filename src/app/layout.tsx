import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { TenantProvider } from '@/components/TenantContextProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

export const metadata: Metadata = {
  title: 'MotoManager CRM Premium',
  description: 'CRM de Alta Gama para talleres de motocicletas',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { SubscriptionStatusAlert } from '@/components/subscription/SubscriptionStatusAlert';

import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import ShaderBackground from '@/components/ui/shader-background';

import { ThemeProvider } from '@/components/ThemeProvider';



import { getWorkshopDetails, getCurrentUserServer } from '@/lib/auth-server';
import { LayoutWrapper } from '@/components/LayoutWrapper';
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workshop = await getWorkshopDetails();
  const user = await getCurrentUserServer();
  
  // Si no hay workshop y no estamos en login/register, podríamos no tener data.
  // El middleware o las páginas se encargarán de redirigir.
  
  let userName = workshop?.user_name || user?.email || '';

  return (
    <html lang="es" suppressHydrationWarning className={cn(inter.variable, spaceGrotesk.variable)}>
      <body className={cn('font-body antialiased bg-background text-foreground min-h-screen flex flex-col relative')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* <ShaderBackground /> */}
          <TenantProvider>
          {/* Subscription Status Check */}
          {workshop && (
            <>
              <SubscriptionStatusAlert
                status={workshop.subscription_status}
                startDate={workshop.subscription_start_date}
                endDate={workshop.subscription_end_date}
              />
              <WelcomeModal
                hasSeenWelcome={workshop.has_seen_welcome ?? false}
                userName={workshop.user_name}
                userRole={workshop.user_role}
                workshopName={workshop.name}
              />
            </>
          )}

          <LayoutWrapper
            header={
              <Header 
                workshopName={workshop?.name}
                workshopSlug={workshop?.slug}
                userName={userName} 
                subscriptionPlan={workshop?.subscription_plan}
                subscriptionEndDate={workshop?.subscription_end_date}
                subscriptionStatus={workshop?.subscription_status}
                workshopCreatedAt={workshop?.created_at}
                userRole={workshop?.user_role}
              />
            }
            footer={
              <footer className="bg-card/30 backdrop-blur-md border-t border-border/50 py-3 px-4 md:px-6 lg:px-8 mt-auto">
                <div className="max-w-7xl mx-auto text-center">
                  <p className="text-muted-foreground text-sm">
                    © {new Date().getFullYear()} MotoManager. Todos los derechos reservados.
                  </p>
                  <p className="text-muted-foreground/70 text-xs mt-1">
                    Sistema de gestión para talleres de motocicletas
                  </p>
                </div>
              </footer>
            }
          >
            {children}
          </LayoutWrapper>
          <Toaster />
        </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

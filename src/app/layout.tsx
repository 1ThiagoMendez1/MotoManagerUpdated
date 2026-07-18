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
import { getWorkshopDetails } from '@/lib/auth-server';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import ShaderBackground from '@/components/ui/shader-background';

import { ThemeProvider } from '@/components/ThemeProvider';

import { createClient } from '@/lib/supabase/server';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workshop = await getWorkshopDetails();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userName = workshop?.user_name;
  if (user && !userName) {
    const { data: profile } = await supabase.from('user_profiles').select('name').eq('id', user.id).single();
    userName = profile?.name || user.email;
  }

  return (
    <html lang="es" suppressHydrationWarning className={cn(inter.variable, spaceGrotesk.variable)}>
      <body className={cn('font-body antialiased bg-background text-foreground min-h-screen flex flex-col relative')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ShaderBackground />
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

          <Header 
            workshopName={workshop?.name} 
            userName={userName} 
            subscriptionPlan={workshop?.subscription_plan}
            subscriptionEndDate={workshop?.subscription_end_date}
            subscriptionStatus={workshop?.subscription_status}
            workshopCreatedAt={workshop?.created_at}
            userRole={workshop?.user_role}
          />
          
          <main className="relative flex-1 pt-[5.5rem] px-4 md:px-6 lg:px-8 overflow-auto flex flex-col">
            {/* Gradiente de fondo sutil premium en lugar de la imagen */}
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-background to-background dark:from-blue-900/10 dark:via-background dark:to-background"></div>

            <div className="max-w-7xl mx-auto py-2 md:py-4 animate-in fade-in duration-500 flex-1 flex flex-col justify-center">
              {children}
            </div>
          </main>
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
          <Toaster />
        </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

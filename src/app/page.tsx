import { Metadata } from 'next';
import { Suspense } from 'react';
import PlanesPage from './planes/PlanesPage';

import { DEFAULT_FEATURES, mergePlansWithDefaults } from '@/lib/constants/plans';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicWorkshops } from '@/actions/public-workshops';
import type { PublicWorkshop } from '@/actions/public-workshops';
import { isHalloweenEditionActive } from '@/lib/seasonal-campaign';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MotoManager | Software de gestión para talleres de motocicletas',
  description:
    'Prueba MotoManager Full gratis por 15 días, sin tarjeta. Organiza clientes, motos, órdenes, inventario, ventas y finanzas de tu taller.',
  keywords: [
    'CRM talleres motos Colombia',
    'software taller motos',
    'gestión taller motocicletas',
    'MotoManager',
    'inventario taller',
    'órdenes de trabajo',
  ],
  openGraph: {
    title: 'MotoManager | Gestiona tu taller de motos',
    description: 'Gestión conectada de clientes, motocicletas, órdenes de trabajo, inventario y ventas para talleres.',
    url: 'https://www.motomanager.com.co/',
    siteName: 'MotoManager',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MotoManager — CRM para talleres de motos',
    description: 'Explora una demo interactiva del software de gestión para talleres de motocicletas. Sin registro para probar.',
  },
};

export default async function Page() {
  const supabase = await createClient();
  let plans: any[] = [];
  let features: any[] = [];
  let user: any = null;
  let workshops: PublicWorkshop[] = [];
  
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;

    // El catálogo público se lee en el servidor desde la tabla comercial
    // vigente. No depende de políticas RLS del visitante anónimo.
    const catalog = createAdminClient();
    const { data: p, error: priceError } = await catalog
      .from('subscription_plans')
      .select('id, name, price, description, badge, savings, months');
    if (priceError) console.error('[landing] Error leyendo precios:', priceError.code);
    if (p) plans = p;
    const { data: f, error: featureError } = await catalog
      .from('subscription_features')
      .select('id, feature_name, order_index, included_in_basic, included_in_pro, included_in_full');
    if (featureError) console.error('[landing] Error leyendo información de planes:', featureError.code);
    if (f) features = f;
  } catch (err) {
    console.error("Error fetching plans data:", err);
  }

  // Directorio visible para Google y para visitantes sin iniciar sesión.
  workshops = await getPublicWorkshops('');

  // Merge with styling properties
  plans = mergePlansWithDefaults(plans);
  
  if (features.length === 0) {
    features = DEFAULT_FEATURES;
  }

  return (
    <>
      <style>{`
        /* Ocultar el header del taller en la landing page */
        body > div > header,
        [data-header="app-header"] {
          display: none !important;
        }
        /* Resetear el padding-top que el layout root pone para el header */
        .planes-root-override {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: #080b14;
          overflow-y: auto;
          overflow-x: hidden;
        }
      `}</style>
      <div className="planes-root-override bg-background">
        <Suspense fallback={
          <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <PlanesPage plans={plans} features={features} user={user} workshops={workshops} halloween={isHalloweenEditionActive()} checkoutReady={Boolean(process.env.WOMPI_PRIVATE_KEY && process.env.WOMPI_INTEGRITY_SECRET && process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY)} />
        </Suspense>
      </div>
    </>
  );
}

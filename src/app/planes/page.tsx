import { Metadata } from 'next';
import { Suspense } from 'react';
import PlanesPage from './PlanesPage';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_FEATURES, mergePlansWithDefaults } from '@/lib/constants/plans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MotoManager — El CRM #1 para talleres de motocicletas en Colombia',
  description:
    'Gestiona clientes, motos, inventario, órdenes de trabajo, ventas y pagos digitales desde un solo lugar. Diseñado para talleres de motocicletas en Colombia. Desde $18.900/mes con Wompi.',
  keywords: [
    'CRM talleres motos Colombia',
    'software taller motos',
    'gestión taller motocicletas',
    'MotoManager',
    'inventario taller',
    'órdenes de trabajo',
  ],
  openGraph: {
    title: 'MotoManager — El CRM #1 para talleres de motos en Colombia',
    description: 'Clientes, inventario, órdenes de trabajo y pagos digitales. Desde $18.900/mes.',
    url: 'https://www.motomanager.com.co/planes',
    siteName: 'MotoManager',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MotoManager — CRM para talleres de motos',
    description: 'Gestiona tu taller como un profesional. Desde $18.900/mes.',
  },
};

export default async function Page() {
  const supabase = await createClient();
  let plans: any[] = [];
  let features: any[] = [];
  let user: any = null;
  
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;

    const { data: p } = await supabase.from('subscription_plans').select('*');
    if (p) plans = p;
    const { data: f } = await supabase.from('subscription_features').select('*');
    if (f) features = f;
  } catch (err) {
    console.error("Error fetching plans data:", err);
  }

  // Merge with styling properties
  plans = mergePlansWithDefaults(plans);
  
  if (features.length === 0) {
    features = DEFAULT_FEATURES;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PlanesPage plans={plans} features={features} user={user} />
    </Suspense>
  );
}

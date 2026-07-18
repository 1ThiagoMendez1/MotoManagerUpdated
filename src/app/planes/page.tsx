import { Metadata } from 'next';
import { Suspense } from 'react';
import PlanesPage from './PlanesPage';
import { createClient } from '@/lib/supabase/server';

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
  
  try {
    const { data: p } = await supabase.from('subscription_plans').select('*');
    if (p) plans = p;
    const { data: f } = await supabase.from('subscription_features').select('*');
    if (f) features = f;
  } catch (err) {
    console.error("Error fetching plans data:", err);
  }

  // Fallback if db is empty or table doesn't exist yet
  if (plans.length === 0) {
    plans = [
      { id: 'monthly', name: 'Mensual', price: 18900, amount_in_cents: 1890000, period: '/ mes', months: 1, description: 'Para empezar sin compromiso', badge: null, savings: null, gradient: 'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20', border: 'border-primary/25', accent_text: 'text-primary', btn: 'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25' },
      { id: 'biannual', name: 'Semestral', price: 99900, amount_in_cents: 9990000, period: '/ 6 meses', months: 6, description: 'El más elegido por los talleres', badge: 'MÁS POPULAR', savings: 'Ahorra $13.500', gradient: 'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20', border: 'border-amber-500/40', accent_text: 'text-amber-600 dark:text-amber-400', btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25' },
      { id: 'yearly', name: 'Anual', price: 199900, amount_in_cents: 19990000, period: '/ año', months: 12, description: 'El mejor valor para tu negocio', badge: 'MEJOR VALOR', savings: 'Ahorra $26.900', gradient: 'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20', border: 'border-purple-500/30', accent_text: 'text-purple-600 dark:text-purple-400', btn: 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25' }
    ];
    features = [
      { id: '1', feature_name: 'Clientes y motos ilimitados', order_index: 10, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
      { id: '2', feature_name: 'Órdenes de trabajo ilimitadas', order_index: 20, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
      { id: '3', feature_name: 'Control de inventario completo', order_index: 30, included_in_monthly: true, included_in_biannual: true, included_in_yearly: true },
    ];
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PlanesPage plans={plans} features={features} />
    </Suspense>
  );
}

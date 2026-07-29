import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserServer, getWorkshopDetails } from '@/lib/auth-server';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  // En Next.js 15, params es una promesa
  const resolvedParams = await params;
  const tenantSlug = resolvedParams.tenant;

  if (['favicon.ico', 'sitemap.xml', 'robots.txt', 'api', '_next'].includes(tenantSlug)) {
    notFound();
  }

  // Verificar que el tenant (slug del taller) realmente exista
  try {
    const supabaseAdmin = createAdminClient();
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('slug')
      .eq('slug', tenantSlug)
      .single();

    if (error || !org) {
      notFound(); // Si el slug no existe, mostramos 404
    }
  } catch (error) {
    console.error('Error verifying tenant:', error);
    notFound();
  }

  // Si el usuario está logueado, redirigirlo a su propio taller si intenta acceder a otro
  const user = await getCurrentUserServer();
  if (user) {
    const workshopDetails = await getWorkshopDetails();
    if (workshopDetails && workshopDetails.slug !== tenantSlug) {
      redirect(`/${workshopDetails.slug}`);
    }
  }

  return <>{children}</>;
}
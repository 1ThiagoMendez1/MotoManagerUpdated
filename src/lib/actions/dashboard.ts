'use server';

import { authorize, getWorkshopDetails } from '@/lib/auth-server';
import { workshopCache } from '@/lib/cache/redis';
import { createClient } from '@/lib/supabase/server';
import { dashboardSummarySchema, formatDashboardSummary } from '@/lib/workshops/dashboard';

export async function getDashboardData() {
  const user = await authorize('/dashboard');
  const supabase = await createClient();
  const [summary, workshop] = await Promise.all([
    workshopCache.remember(user, 'dashboard-summary', {}, async () => {
      const result = await supabase.rpc('workshop_dashboard_summary', { p_organization_id: user.workshopId });
      if (result.error) throw new Error('No se pudieron cargar las métricas del taller.');
      return dashboardSummarySchema.parse(result.data);
    }),
    getWorkshopDetails(user),
  ]);
  const data = formatDashboardSummary(summary);
  return { success: true, data: {
    ...data, workshopName: workshop?.name || 'Mi Taller',
    subscriptionPlan: workshop?.subscription_plan || 'basic',
  } };
}

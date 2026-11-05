'use server';

import { authorize, getWorkshopDetails } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { dashboardSummarySchema, formatDashboardSummary } from '@/lib/workshops/dashboard';

export async function getDashboardData() {
  const user = await authorize('/dashboard');
  const supabase = await createClient();
  const [summary, workshop] = await Promise.all([
    supabase.rpc('workshop_dashboard_summary', { p_organization_id: user.workshopId }),
    getWorkshopDetails(user),
  ]);
  if (summary.error) {
    console.error('Dashboard summary failed:', summary.error.code);
    throw new Error('No se pudieron cargar las métricas del taller.');
  }
  const data = formatDashboardSummary(dashboardSummarySchema.parse(summary.data));
  return { success: true, data: {
    ...data, workshopName: workshop?.name || 'Mi Taller',
    subscriptionPlan: workshop?.subscription_plan || 'basic',
  } };
}

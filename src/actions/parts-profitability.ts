'use server';
import { authorize } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';
import { validatePartsProfitFilters, type PartsProfitFilters, type PartsProfitReport } from '@/lib/parts-profitability';

export async function getPartsProfitability(organizationId: string,filters: PartsProfitFilters): Promise<PartsProfitReport> {
  noStore();
  const user=await authorize('/accounting');
  if (!user.workshopId || user.workshopId!==organizationId) throw new Error('No tienes acceso a la contabilidad de este taller.');
  const values=validatePartsProfitFilters(filters);
  const client=await createClient();
  const {data,error}=await client.rpc('workshop_parts_profitability',{
    p_org:user.workshopId,p_from:values.from,p_to:values.to,p_query:values.query,p_sort:values.sort,
    p_include_estimates:values.includeEstimates,p_page:values.page,p_limit:25,
  });
  if (error || !data || !Array.isArray(data.rows) || !data.summary) {
    console.error('Parts profitability query failed',error?.code || 'invalid_response');
    throw new Error('No se pudo consultar la rentabilidad de repuestos. Intenta nuevamente.');
  }
  return data as PartsProfitReport;
}

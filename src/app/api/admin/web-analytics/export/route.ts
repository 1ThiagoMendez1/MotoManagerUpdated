import { createOwnerAnalyticsHandler, privateHeaders } from '@/lib/analytics/web-http';
import { analyticsCsv, loadAnalyticsPayload, resolveAnalyticsActor } from '@/lib/analytics/web-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createOwnerAnalyticsHandler({actor:resolveAnalyticsActor,load:async(request)=>{
  const payload=await loadAnalyticsPayload(request);
  return new Response(analyticsCsv(payload),{headers:{...privateHeaders,'Content-Type':'text/csv; charset=utf-8',
    'Content-Disposition':'attachment; filename="MotoManager-analitica-web.csv"'}});
}});

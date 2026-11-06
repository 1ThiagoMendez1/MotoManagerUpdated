import { createOwnerAnalyticsHandler } from '@/lib/analytics/web-http';
import { loadAnalyticsPayload, resolveAnalyticsActor } from '@/lib/analytics/web-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createOwnerAnalyticsHandler({actor:resolveAnalyticsActor,load:loadAnalyticsPayload});

import { analyticsCollector } from '@/lib/analytics/web-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>analyticsCollector()(request);
export const DELETE=(request:Request)=>analyticsCollector()(request);

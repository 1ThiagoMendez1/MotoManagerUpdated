import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth-server';
import { WebAnalyticsDashboard } from './WebAnalyticsDashboard';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Analítica web | Administración MotoManager',robots:{index:false,follow:false}};
export default async function WebAnalyticsPage(){
  await requireSuperAdmin();
  return <WebAnalyticsDashboard/>;
}

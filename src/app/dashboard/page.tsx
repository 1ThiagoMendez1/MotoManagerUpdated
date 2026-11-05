import { authorize } from '@/lib/auth-server';

import DashboardPageClient from './DashboardClient';
import Link from 'next/link';
import { Inbox, ArrowRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await authorize('/dashboard');
  let intakeCount = 0;
  if (user.workshopId && ['owner','admin'].includes(user.role)) {
    const admin = createAdminClient() as any;
    const { count, error } = await admin.from('customer_intake_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', user.workshopId).eq('status', 'pending');
    if (!error) intakeCount = count ?? 0;
  }
  return <>
    {intakeCount > 0 && <div className="px-4 pt-4 sm:px-7">
      <Link href="/customers/intake" className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition hover:bg-primary/15">
        <span className="flex items-center gap-3"><Inbox className="h-6 w-6 text-primary"/>
          <span><strong className="block">{intakeCount} {intakeCount===1 ? 'cliente nuevo esperando recepción' : 'clientes nuevos esperando recepción'}</strong>
          <small className="text-muted-foreground">Toca para confirmar la moto e ingresarla al taller.</small></span>
        </span><ArrowRight className="h-5 w-5 shrink-0 text-primary"/>
      </Link>
    </div>}
    <DashboardPageClient />
  </>;
}

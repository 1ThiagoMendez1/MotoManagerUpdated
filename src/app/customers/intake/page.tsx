import Link from 'next/link';
import { authorize } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Inbox, RefreshCcw } from 'lucide-react';
import IntakeCards, { type IntakeRequest } from './IntakeCards';

export const dynamic = 'force-dynamic';

export default async function CustomerIntakePage() {
  const user = await authorize('/customers');
  if (!user.workshopId || !['owner','admin'].includes(user.role)) {
    return <main className="p-8"><h1 className="text-xl font-bold">Recepción de clientes QR</h1>
      <p className="mt-3 text-muted-foreground">Solo propietarios y administradores pueden confirmar solicitudes.</p>
      <Button asChild variant="outline" className="mt-4"><Link href="/customers">Volver a clientes</Link></Button>
    </main>;
  }
  // Server-only service role, scoped to the authenticated user's tenant.
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from('customer_intake_requests')
    .select('id,plate,suggested_brand,suggested_model,created_at,customers(first_name,last_name,phone,email)')
    .eq('organization_id', user.workshopId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(75);
  if (error) {
    console.error('[customer-intake] Read failed:', error.code);
    return <main className="p-8"><h1 className="text-xl font-semibold">Bandeja de clientes QR</h1>
      <p role="alert" className="mt-4 text-destructive">La bandeja todavía no está disponible. Revisa la migración de recepción QR.</p>
    </main>;
  }
  const requests: IntakeRequest[] = (data || []).map((entry: any) => {
    const customer = Array.isArray(entry.customers) ? entry.customers[0] : entry.customers;
    return {
      id: entry.id,
      customerName: [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Cliente',
      phone: customer?.phone || null, email: customer?.email || null,
      plate: entry.plate || null, brand: entry.suggested_brand || null,
      model: entry.suggested_model || null, createdAt: entry.created_at,
    };
  });
  return <main className="space-y-6 p-4 sm:p-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Clientes</Link>
        <h1 className="mt-3 flex items-center gap-3 text-2xl font-bold sm:text-3xl"><Inbox className="h-7 w-7 text-primary"/>Recepción QR</h1>
        <p className="mt-2 text-sm text-muted-foreground">Recibe nuevos clientes, confirma su placa y agrega la moto a tu taller en segundos.</p>
      </div>
      <Button asChild variant="outline"><Link href="/customers/intake"><RefreshCcw className="mr-2 h-4 w-4"/>Actualizar</Link></Button>
    </header>
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <p className="text-3xl font-bold text-primary">{requests.length}</p>
      <p className="text-sm font-medium">Solicitudes de clientes pendientes de recepción</p>
      <p className="mt-2 text-xs text-muted-foreground">Tu QR notifica al dueño o administrador dentro de MotoManager. Los datos de la moto no se publican hasta confirmarlos.</p>
    </div>
    <IntakeCards requests={requests}/>
  </main>;
}

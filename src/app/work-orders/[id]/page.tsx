import { getWorkOrderById, getInventory, getTechnicians, getRemindersByMotorcycleId } from '@/lib/data';
import { getServices } from '@/actions/services';
import { requireWorkshop } from '@/lib/auth-server';
import { AlertCircle } from 'lucide-react';
import { WorkOrderDetailClient } from './WorkOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const workOrder = await getWorkOrderById(resolvedParams.id);

  if (!workOrder) {
    return (
      <div className="text-foreground p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Orden no encontrada</h2>
      </div>
    );
  }

  const user = await requireWorkshop();
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: partRequests, error: prError } = await supabaseAdmin
    .from('part_requests')
    .select(`
        *,
        inventory_items ( name, code ),
        requester:profiles!part_requests_requested_by_fkey ( first_name, last_name ),
        fulfiller:profiles!part_requests_fulfilled_by_fkey ( first_name, last_name )
    `)
    .eq('work_order_id', workOrder.id)
    .order('created_at', { ascending: false });

  if (prError) {
    console.error('Error fetching part requests:', prError);
  }

  const [inventory, { items: technicians }, reminders, services] = await Promise.all([
    getInventory({ page: 1 } as any),
    getTechnicians(),
    getRemindersByMotorcycleId(workOrder.motorcycle.id),
    getServices(workOrder.organizationId || '')
  ]);

  const isCompleted = workOrder.status === 'Entregado';

  // Calculate totals
  const itemsCost = (workOrder.sales || []).reduce((total: number, sale: any) => {
    return total + (sale.saleItems || []).reduce((saleTotal: number, item: any) => {
      return saleTotal + (item.price * item.quantity);
    }, 0);
  }, 0);

  const servicesCost = (workOrder.work_order_services || []).reduce((total: number, service: any) => {
    return total + service.total;
  }, 0);

  const totalCost = itemsCost + servicesCost;
  const depositAmount = (workOrder as any).depositAmount ?? 0;
  const pendingBalance = Math.max(0, totalCost - depositAmount);

  return (
    <WorkOrderDetailClient
      workOrder={workOrder}
      isCompleted={isCompleted}
      technicians={technicians}
      inventory={inventory}
      userRole={user.role}
      partRequests={partRequests as any || []}
      services={services}
      reminders={reminders}
      totalCost={totalCost}
      depositAmount={depositAmount}
      pendingBalance={pendingBalance}
    />
  );
}
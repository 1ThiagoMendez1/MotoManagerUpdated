import { updateWorkOrderSolution } from '@/lib/actions/work-orders';
import { getWorkOrderById, getInventory, getTechnicians, getRemindersByMotorcycleId } from '@/lib/data';
import { AddItemToWorkOrder } from '@/components/forms/AddItemToWorkOrder';
import { RemoveItemFromWorkOrder } from '@/components/forms/RemoveItemFromWorkOrder';
import { AddDepositForm } from '@/components/forms/AddDepositForm';
import { AddReminderForm } from '@/components/forms/AddReminderForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReassignTechnician } from '@/components/forms/ReassignTechnician';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ClipboardList, 
  Bike, 
  Users, 
  Wrench, 
  CheckCircle2, 
  DollarSign, 
  Package, 
  Save,
  Calendar,
  Activity,
  AlertCircle
} from 'lucide-react';
import { WorkOrderStepper } from '@/components/WorkOrderStepper';
import { QuoteStatusWidget } from '@/components/work-orders/QuoteStatusWidget';
import { SaveAndSendButton } from '@/components/work-orders/SaveAndSendButton';
import { EvidenceManager } from '@/components/work-orders/EvidenceManager';
// import { OrderWhatsAppChat } from './OrderWhatsAppChat';

import { AddServiceToWorkOrder } from '@/components/forms/AddServiceToWorkOrder';
import { RemoveServiceFromWorkOrder } from '@/components/forms/RemoveServiceFromWorkOrder';
import { getServices } from '@/actions/services';
import { requireWorkshop } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { PartRequestsSection } from '@/components/work-orders/PartRequestsSection';

export const dynamic = 'force-dynamic';

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const workOrder = await getWorkOrderById(resolvedParams.id);

  if (!workOrder) return <div className="text-foreground p-8 flex flex-col items-center justify-center min-h-[50vh]"><AlertCircle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-2xl font-bold">Orden no encontrada</h2></div>;

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
    <div className="w-full max-w-6xl mx-auto text-foreground py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/work-orders" className="group p-2.5 bg-card hover:bg-muted rounded-xl transition-all border border-border/50 hover:border-border hover:shadow-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-space bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Orden #{workOrder.workOrderNumber}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Gestiona todos los detalles de esta orden de trabajo
            </p>
          </div>
        </div>
        
        {/* Stepper dinámico Premium */}
        <div className="px-6 py-4 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20" />
          <WorkOrderStepper currentStatus={workOrder.status} />
        </div>
      </div>

      {/* Quote Status & WhatsApp Widget */}
      <div className="mb-8">
        <QuoteStatusWidget 
          workOrderId={workOrder.id} 
          initialStatus={(workOrder as any).quote_status} 
          customerPhone={workOrder.motorcycle.customer.phone || undefined}
          customerName={workOrder.motorcycle.customer.name}
          workshopName={(workOrder as any).workshop?.name}
          orderNumber={workOrder.workOrderNumber?.toString()}
          technicianName={workOrder.technician?.name}
        />
        {workOrder.customerObservations && workOrder.customerObservations.includes('Rechazada') && (
            <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex gap-3 text-sm">
               <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
               <div>
                 <h4 className="font-medium text-red-500 mb-1">Motivo del Rechazo (Cliente)</h4>
                 <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                   {workOrder.customerObservations.split('\n').filter(line => line.includes('Rechazada') && !line.includes('retirados')).join('\n')}
                 </p>
               </div>
            </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl hover:border-border transition-all duration-300">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-blue-500/10 rounded-xl shadow-inner">
                    <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wider font-medium">Creada</p>
                   <p className="font-medium text-foreground">{format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-purple-500/10 rounded-xl shadow-inner">
                    <Activity className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Estado</p>
                   <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                      {workOrder.status}
                   </div>
                 </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl hover:border-border transition-all duration-300">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              Motocicleta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Información del Vehículo</p>
                <div className="p-4 bg-muted/50 rounded-xl border border-border/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-lg leading-none">{workOrder.motorcycle.make}</p>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-lg border border-emerald-500/20 uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                      {workOrder.motorcycle.plate || 'S/N'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-sm border-t border-border/50 pt-2 mt-1">
                    <p className="font-medium">{workOrder.motorcycle.model}</p>
                    {workOrder.motorcycle.year > 0 ? (
                      <p className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-md">Modelo {workOrder.motorcycle.year}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-xl hover:border-border transition-all duration-300">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              Cliente y Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Cliente</p>
                <p className="font-medium text-foreground px-1">{workOrder.motorcycle.customer.name}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/50 p-3.5 rounded-xl border border-border/50 shadow-inner">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Técnico Asignado</p>
                  <p className="font-medium text-foreground">{workOrder.technician?.name ?? 'Sin asignar'}</p>
                </div>
                {!isCompleted && (
                  <div className="shrink-0">
                    <ReassignTechnician workOrder={workOrder} technicians={technicians} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnóstico Inicial Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            Motivo de Ingreso / Diagnóstico Inicial
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 shadow-inner">
            <p className="text-foreground whitespace-pre-wrap">
              {workOrder.issueDescription || 'No se registró diagnóstico inicial o motivo de ingreso.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Solución Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-medium flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Solución del arreglo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4 relative z-10">
          {isCompleted ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Resumen de la solución aplicada a la motocicleta:
              </p>
              <Textarea
                readOnly
                value={(workOrder as any).solutionDescription ?? 'Sin solución registrada.'}
                className="bg-muted text-foreground border-border/50 min-h-[120px] resize-none pointer-events-none"
              />
            </div>
          ) : (
            <form action={updateWorkOrderSolution} className="space-y-5">
              <input type="hidden" name="workOrderId" value={workOrder.id} />
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Descripción de la solución
                </label>
                <Textarea
                  name="solutionDescription"
                  defaultValue={(workOrder as any).solutionDescription ?? ''}
                  placeholder="Ejemplo: Se reemplazó la bomba de gasolina y se ajustó el carburador..."
                  className="bg-muted text-foreground border-border/50 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 min-h-[120px] transition-all resize-y placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all">
                  Guardar solución
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Evidencias Section */}
      <EvidenceManager workOrderId={workOrder.id} organizationId={(workOrder as any).organizationId} evidences={workOrder.images || []} />

      {/* Recordatorio Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardContent className="pt-6 relative z-10">
          <AddReminderForm workOrderId={workOrder.id} reminders={reminders} />
        </CardContent>
      </Card>

      {/* Abonos Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-medium flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
            Abonos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 shadow-inner">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300/80 mb-1 font-medium">Total abonado por el cliente</p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                ${((workOrder as any).depositAmount ?? 0).toLocaleString('es-CO')}
              </p>
            </div>

            {!isCompleted ? (
              <div className="w-full md:w-auto min-w-[300px]">
                <AddDepositForm workOrderId={workOrder.id} currentDeposit={(workOrder as any).depositAmount ?? 0} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400/90 bg-green-500/10 px-5 py-3 rounded-xl border border-green-500/20">
                 <CheckCircle2 className="w-5 h-5" />
                 <span className="font-medium">Orden finalizada. No se permiten abonos.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insumos Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg relative group transition-all duration-300 hover:border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-medium flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            Insumos y Repuestos Usados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          {isCompleted ? (
            <div className="mb-8 bg-orange-500/10 p-5 rounded-xl border border-orange-500/20 flex gap-4 items-start">
              <AlertCircle className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium mb-1 text-orange-900 dark:text-orange-100">Orden Finalizada</h3>
                <p className="text-sm text-orange-800/80 dark:text-orange-200/70">
                  Esta orden se encuentra en estado <span className="font-semibold text-orange-600 dark:text-orange-400">Entregado</span>.
                  No es posible agregar nuevos items porque la orden ya fue finalizada y facturada.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-8 bg-muted/50 p-6 rounded-2xl border border-border/50 shadow-inner">
              <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Agregar Nuevo Item
              </h3>
              <AddItemToWorkOrder workOrderId={workOrder.id} inventory={inventory.items} userRole={user.role} />
            </div>
          )}

          <PartRequestsSection workOrderId={workOrder.id} requests={partRequests as any || []} userRole={user.role} />

          <div className="mt-8">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Items Actuales
            </h3>
            
            {!workOrder.sales || workOrder.sales.length === 0 || workOrder.sales.every(sale => !sale.saleItems || sale.saleItems.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/20 border border-dashed border-border/50 rounded-2xl">
                <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No hay insumos registrados</p>
                <p className="text-sm text-muted-foreground/70">Agrega repuestos desde la sección superior.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(workOrder.sales || []).flatMap((sale: any) =>
                  (sale.saleItems || []).map((item: any) => (
                    <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/30 hover:bg-muted/50 p-4 rounded-xl border border-border/50 transition-colors group">
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-1">{item.inventoryItem.name}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="bg-background/80 px-2 py-0.5 rounded text-muted-foreground">Cant: <span className="text-foreground font-medium">{item.quantity}</span></span>
                          <span className="bg-background/80 px-2 py-0.5 rounded text-muted-foreground">Precio: <span className="text-foreground font-medium">${item.price.toLocaleString('es-CO')}</span></span>
                        </div>
                      </div>
                      {!isCompleted && (
                        <div className="shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <RemoveItemFromWorkOrder workOrderId={workOrder.id} saleItemId={item.id} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Servicios Realizados Section */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-md overflow-hidden shadow-lg mb-8 relative group transition-all duration-300 hover:border-border mt-8">
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-medium flex items-center gap-2">
            <Wrench className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />
            Servicios Realizados (Mano de Obra)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          {isCompleted ? (
            <div className="mb-8 bg-fuchsia-500/10 p-5 rounded-xl border border-fuchsia-500/20 flex gap-4 items-start">
              <AlertCircle className="w-6 h-6 text-fuchsia-500 dark:text-fuchsia-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium mb-1 text-fuchsia-900 dark:text-fuchsia-100">Orden Finalizada</h3>
                <p className="text-sm text-fuchsia-800/80 dark:text-fuchsia-200/70">
                  No es posible agregar nuevos servicios porque la orden ya fue finalizada y facturada.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-8 bg-muted/50 p-6 rounded-2xl border border-border/50 shadow-inner">
              <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
                Agregar Nuevo Servicio
              </h3>
              <AddServiceToWorkOrder workOrderId={workOrder.id} services={services} />
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Servicios Actuales
            </h3>
            
            {!workOrder.work_order_services || workOrder.work_order_services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/20 border border-dashed border-border/50 rounded-2xl">
                <Wrench className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No hay servicios registrados</p>
                <p className="text-sm text-muted-foreground/70">Selecciona un servicio del catálogo en la sección superior.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(workOrder.work_order_services || []).map((wos: any) => (
                  <div key={wos.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/30 hover:bg-muted/50 p-4 rounded-xl border border-border/50 transition-colors group">
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-1">{wos.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="bg-background/80 px-2 py-0.5 rounded text-muted-foreground">Categoría: <span className="text-foreground font-medium">{wos.service_catalog?.category || 'N/A'}</span></span>
                        <span className="bg-background/80 px-2 py-0.5 rounded text-muted-foreground">Precio: <span className="text-foreground font-medium">${wos.total.toLocaleString('es-CO')}</span></span>
                      </div>
                    </div>
                    {!isCompleted && (
                      <div className="shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <RemoveServiceFromWorkOrder workOrderId={workOrder.id} workOrderServiceId={wos.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button / Bottom Nav */}
      <div className="flex justify-end mt-8 pb-12">
        <div className="w-full sm:w-auto">
          <SaveAndSendButton 
            workOrderId={workOrder.id}
            customerPhone={workOrder.motorcycle.customer.phone || undefined}
            customerName={workOrder.motorcycle.customer.name}
            workshopName={(workOrder as any).workshop?.name}
            orderNumber={workOrder.workOrderNumber?.toString()}
            technicianName={workOrder.technician?.name}
          />
        </div>
      </div>
    </div>
  );
}
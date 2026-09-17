import { authorize } from '@/lib/auth-server';
import { getWorkOrders, getMotorcycles, getTechnicians } from '@/lib/data';
import type { WorkOrder } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AddWorkOrder } from '@/components/forms/AddWorkOrder';
import { UpdateWorkOrderStatus } from '@/components/forms/UpdateWorkOrderStatus';
import { UpdateQuoteStatus } from '@/components/forms/UpdateQuoteStatus';
import { ReassignTechnician } from '@/components/forms/ReassignTechnician';
import { SearchWorkOrders } from '@/components/forms/SearchWorkOrders';
import { formatExactDateTime } from '@/lib/dateUtils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ClipboardList, Eye, BellRing, CheckCircle2, Clock } from 'lucide-react';
import WorkOrdersRealtime from './WorkOrdersRealtime';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';
import { StatusBadge } from '@/components/common/StatusBadge';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await authorize('/work-orders');
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams.query as string) || '';
  const activePage = Number(resolvedSearchParams.activePage) || 1;
  const completedPage = Number(resolvedSearchParams.completedPage) || 1;

  const [activeWOData, completedWOData, motorcyclesData, techniciansData] = await Promise.all([
    getWorkOrders({ query, page: activePage, statusFilter: 'active' }),
    getWorkOrders({ query, page: completedPage, statusFilter: 'completed' }),
    getMotorcycles({ limit: 1000 } as any),
    getTechnicians({ limit: 1000 } as any),
  ]);

  const activeWorkOrders = activeWOData.items;
  const totalActivePages = activeWOData.totalPages;

  const completedWorkOrders = completedWOData.items;
  const totalCompletedPages = completedWOData.totalPages;
  
  const motorcycles = motorcyclesData.items;
  const technicians = techniciansData.items;
  const [allWO] = await Promise.all([getWorkOrders({ limit: 1000 } as any)]);
  const workOrders = allWO.items;

  const motorcyclesWithoutAnyWorkOrder = motorcycles.filter(
    (moto) => !workOrders.some((wo) => wo.motorcycle?.id === moto.id)
  );

  return (
    <div className="w-full space-y-4">
      <WorkOrdersRealtime />

      {/* Header Estandarizado */}
      <PageHeader
        title="Órdenes de Trabajo"
        description="Rastrea, asigna y gestiona todas las reparaciones activas e historial de entregas."
        icon={ClipboardList}
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
            {activeWorkOrders.length} activas
          </span>
        }
      />

      {/* Toolbar Compacto */}
      <ModuleToolbar
        searchComponent={<SearchWorkOrders />}
        primaryAction={
          <AddWorkOrder 
            motorcycles={motorcyclesWithoutAnyWorkOrder} 
            technicians={technicians} 
          />
        }
      />

      {/* Navegación Segmentada (Activas / Finalizadas) */}
      <Tabs defaultValue="active" className="w-full">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <TabsList className="bg-muted/50 border border-border/60 p-1 rounded-xl h-10">
            <TabsTrigger 
              value="active" 
              className="rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-3.5"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Trabajos Activos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/15 text-primary font-bold">
                {activeWorkOrders.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-3.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Finalizados</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                {completedWorkOrders.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Activas */}
        <TabsContent value="active" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                      <TableHead className="w-[100px] text-foreground font-semibold text-xs uppercase tracking-wider py-3">N° Orden</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Motocicleta & Cliente</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Ingreso</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Técnico</TableHead>
                      <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Estado</TableHead>
                      <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cotización</TableHead>
                      <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeWorkOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                          No hay órdenes de trabajo activas en este momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeWorkOrders.map((order) => (
                        <TableRow key={order.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-bold text-primary text-xs sm:text-sm">
                            #{order.workOrderNumber}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm leading-tight">
                              {order.motorcycle.make} {order.motorcycle.model}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-[11px] text-foreground">
                                {order.motorcycle.plate || 'S/P'}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[180px]">{order.motorcycle.customer.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatExactDateTime(order.motorcycle.intakeDate)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {order.technician?.name ?? (
                              <span className="text-muted-foreground/70 italic text-xs">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <StatusBadge status={order.status} />
                              {order.pendingPartRequestsCount && order.pendingPartRequestsCount > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0 px-1.5">
                                  <BellRing className="w-2.5 h-2.5 mr-1 inline animate-pulse" />
                                  {order.pendingPartRequestsCount} repuesto{order.pendingPartRequestsCount > 1 ? 's' : ''}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <UpdateQuoteStatus workOrder={order} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/work-orders/${order.id}`}>
                                <Button 
                                  size="sm" 
                                  className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-2.5"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Gestionar
                                </Button>
                              </Link>
                              <UpdateWorkOrderStatus workOrder={order} />
                              <ReassignTechnician workOrder={order} technicians={technicians} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación Activas */}
              {totalActivePages > 1 && (
                <div className="p-3 border-t border-border/50 flex justify-center bg-muted/10">
                  <div className="flex items-center space-x-1.5 text-xs font-medium">
                    <a
                      href={`/work-orders?${new URLSearchParams({
                        ...(query && { query }),
                        ...(completedPage > 1 && { completedPage: completedPage.toString() }),
                        activePage: Math.max(1, activePage - 1).toString(),
                      }).toString()}`}
                      className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                        activePage === 1 ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      ← Anterior
                    </a>
                    <span className="px-3 py-1 text-muted-foreground">
                      Página {activePage} de {totalActivePages}
                    </span>
                    <a
                      href={`/work-orders?${new URLSearchParams({
                        ...(query && { query }),
                        ...(completedPage > 1 && { completedPage: completedPage.toString() }),
                        activePage: Math.min(totalActivePages, activePage + 1).toString(),
                      }).toString()}`}
                      className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                        activePage === totalActivePages ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      Siguiente →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Finalizadas */}
        <TabsContent value="completed" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                      <TableHead className="w-[100px] text-foreground font-semibold text-xs uppercase tracking-wider py-3">N° Orden</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Motocicleta & Cliente</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Fecha Ingreso</TableHead>
                      <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Técnico</TableHead>
                      <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Estado</TableHead>
                      <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cotización</TableHead>
                      <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedWorkOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                          No hay órdenes finalizadas con este criterio.
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedWorkOrders.map((order) => (
                        <TableRow key={order.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-bold text-muted-foreground text-xs sm:text-sm">
                            #{order.workOrderNumber}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm leading-tight">
                              {order.motorcycle.make} {order.motorcycle.model}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-[11px] text-foreground">
                                {order.motorcycle.plate || 'S/P'}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[180px]">{order.motorcycle.customer.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatExactDateTime(order.motorcycle.intakeDate)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {order.technician?.name ?? (
                              <span className="text-muted-foreground/70 italic text-xs">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <UpdateQuoteStatus workOrder={order} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Link href={`/work-orders/${order.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs font-medium border-border/80 text-foreground hover:bg-card px-2.5"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Ver Detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación Finalizadas */}
              {totalCompletedPages > 1 && (
                <div className="p-3 border-t border-border/50 flex justify-center bg-muted/10">
                  <div className="flex items-center space-x-1.5 text-xs font-medium">
                    <a
                      href={`/work-orders?${new URLSearchParams({
                        ...(query && { query }),
                        ...(activePage > 1 && { activePage: activePage.toString() }),
                        completedPage: Math.max(1, completedPage - 1).toString(),
                      }).toString()}`}
                      className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                        completedPage === 1 ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      ← Anterior
                    </a>
                    <span className="px-3 py-1 text-muted-foreground">
                      Página {completedPage} de {totalCompletedPages}
                    </span>
                    <a
                      href={`/work-orders?${new URLSearchParams({
                        ...(query && { query }),
                        ...(activePage > 1 && { activePage: activePage.toString() }),
                        completedPage: Math.min(totalCompletedPages, completedPage + 1).toString(),
                      }).toString()}`}
                      className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                        completedPage === totalCompletedPages ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      Siguiente →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

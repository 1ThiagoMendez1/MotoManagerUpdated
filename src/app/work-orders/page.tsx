import { authorize } from '@/lib/auth-server';
import { getWorkOrders, getMotorcycles, getTechnicians } from '@/lib/data';


// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
import type { WorkOrder } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';
import { AddWorkOrder } from '@/components/forms/AddWorkOrder';
import { UpdateWorkOrderStatus } from '@/components/forms/UpdateWorkOrderStatus';
import { UpdateQuoteStatus } from '@/components/forms/UpdateQuoteStatus';
import { ReassignTechnician } from '@/components/forms/ReassignTechnician';
import { SearchWorkOrders } from '@/components/forms/SearchWorkOrders';
import { formatExactDateTime } from '@/lib/dateUtils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ClipboardList, PlusCircle, Wrench, Calendar, Bike, User, Eye, Search, AlertCircle, BellRing } from 'lucide-react';
import WorkOrdersRealtime from './WorkOrdersRealtime';

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
  // Para la creacion de ordenes, idealmente no traemos todas las ordenes pero chequeamos.
  const [allWO] = await Promise.all([getWorkOrders({ limit: 1000 } as any)]);
  const workOrders = allWO.items;

  const motorcyclesWithoutAnyWorkOrder = motorcycles.filter(
    (moto) => !workOrders.some((wo) => wo.motorcycle?.id === moto.id)
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Entregado':
        return 'default';
      case 'Reparado':
        return 'secondary';
      case 'Diagnosticando':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="w-full">
      <WorkOrdersRealtime />
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground text-muted-foreground mt-2">Rastrea y gestiona todos los trabajos en curso.</p>
        </div>
        <div className="flex gap-3 flex-grow sm:flex-grow-0">
          <SearchWorkOrders />
        </div>
        <div className="flex gap-3">
          <AddWorkOrder motorcycles={motorcyclesWithoutAnyWorkOrder} technicians={technicians} />
        </div>
      </div>
      <Card className="bg-card/50 border-border/50 text-foreground backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Trabajos Activos</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Todas las órdenes de trabajo actuales y pasadas. Página {activePage} de {totalActivePages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-card/50">
                  <TableHead className="text-foreground/90 font-semibold">Número</TableHead>
                  <TableHead className="text-foreground/90 font-semibold">Motocicleta</TableHead>
                  <TableHead className="text-foreground/90 font-semibold">Fecha de Ingreso</TableHead>
                  <TableHead className="text-foreground/90 font-semibold">Técnico</TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">Estado</TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">Cotización</TableHead>
                  <TableHead className="text-center text-foreground/90 font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {activeWorkOrders.map((order) => (
                <TableRow key={order.id} className="border-border/50 hover:bg-card/50">
                  <TableCell className="font-medium">{order.workOrderNumber}</TableCell>
                  <TableCell className="font-medium">
                    <div>{order.motorcycle.make} {order.motorcycle.model}</div>
                    <div className="text-sm text-muted-foreground">{order.motorcycle.customer.name}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatExactDateTime(order.motorcycle.intakeDate)}
                  </TableCell>
                  <TableCell>{order.technician?.name ?? 'Sin asignar'}</TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <Badge variant={getStatusVariant(order.status) as any}>
                        {order.status}
                      </Badge>
                      {order.diagnosticandoDate && (
                        <div className="text-xs text-muted-foreground">
                          {order.status === 'Diagnosticando' && `Desde: ${formatExactDateTime(order.diagnosticandoDate)}`}
                          {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${formatExactDateTime(order.reparadoDate)}`}
                          {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${formatExactDateTime(order.entregadoDate)}`}
                        </div>
                      )}
                      {order.pendingPartRequestsCount && order.pendingPartRequestsCount > 0 ? (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs py-0.5">
                            <BellRing className="w-3 h-3 mr-1 inline-block animate-pulse" />
                            {order.pendingPartRequestsCount} pendiente{order.pendingPartRequestsCount > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <UpdateQuoteStatus workOrder={order} />
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Link href={`/work-orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="bg-transparent border-border/80 text-foreground hover:bg-card/50">
                        <Eye className="h-4 w-4 mr-2" />
                        Gestionar
                      </Button>
                    </Link>
                    <UpdateWorkOrderStatus workOrder={order} />
                    <ReassignTechnician workOrder={order} technicians={technicians} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

          {/* Pagination for Active Work Orders */}
          {totalActivePages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <a
                  href={`/work-orders?${new URLSearchParams({
                    ...(query && { query }),
                    ...(completedPage > 1 && { completedPage: completedPage.toString() }),
                    activePage: Math.max(1, activePage - 1).toString(),
                  }).toString()}`}
                  className={`px-4 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-lg hover:bg-card/80 transition-colors ${
                    activePage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                  }`}
                >
                  ← Anterior
                </a>

                {/* Page Numbers */}
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalActivePages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalActivePages - 4, activePage - 2)) + i;
                    if (pageNum > totalActivePages) return null;

                    return (
                      <a
                        key={pageNum}
                        href={`/work-orders?${new URLSearchParams({
                          ...(query && { query }),
                          ...(completedPage > 1 && { completedPage: completedPage.toString() }),
                          activePage: pageNum.toString(),
                        }).toString()}`}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          pageNum === activePage
                            ? 'bg-blue-600 text-foreground'
                            : 'text-foreground bg-card/50 border border-border/50 hover:bg-card/80'
                        }`}
                      >
                        {pageNum}
                      </a>
                    );
                  })}
                </div>

                {/* Next Button */}
                <a
                  href={`/work-orders?${new URLSearchParams({
                    ...(query && { query }),
                    ...(completedPage > 1 && { completedPage: completedPage.toString() }),
                    activePage: Math.min(totalActivePages, activePage + 1).toString(),
                  }).toString()}`}
                  className={`px-4 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-lg hover:bg-card/80 transition-colors ${
                    activePage === totalActivePages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                  }`}
                >
                  Siguiente →
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {completedWorkOrders.length > 0 && (
        <Card className="mt-8 bg-card/30 border-border/50 text-foreground backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Trabajos Finalizados</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Órdenes de trabajo que ya han sido entregadas al cliente. Página {completedPage} de {totalCompletedPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-card/50">
                    <TableHead className="text-foreground/90 font-semibold">Número</TableHead>
                    <TableHead className="text-foreground/90 font-semibold">Motocicleta</TableHead>
                    <TableHead className="text-foreground/90 font-semibold">Fecha de Ingreso</TableHead>
                    <TableHead className="text-foreground/90 font-semibold">Técnico</TableHead>
                    <TableHead className="text-center text-foreground/90 font-semibold">Estado</TableHead>
                    <TableHead className="text-center text-foreground/90 font-semibold">Cotización</TableHead>
                    <TableHead className="text-center text-foreground/90 font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedWorkOrders.map((order) => (
                    <TableRow key={order.id} className="border-border/50 hover:bg-card/50">
                      <TableCell className="font-medium">{order.workOrderNumber}</TableCell>
                      <TableCell className="font-medium">
                        <div>{order.motorcycle.make} {order.motorcycle.model}</div>
                        <div className="text-sm text-muted-foreground">{order.motorcycle.customer.name}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatExactDateTime(order.motorcycle.intakeDate)}
                      </TableCell>
                      <TableCell>{order.technician?.name ?? 'Sin asignar'}</TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <Badge variant={getStatusVariant(order.status) as any}>
                            {order.status}
                          </Badge>
                          {order.diagnosticandoDate && (
                            <div className="text-xs text-muted-foreground">
                              {order.status === 'Diagnosticando' && `Desde: ${formatExactDateTime(order.diagnosticandoDate)}`}
                              {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${formatExactDateTime(order.reparadoDate)}`}
                              {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${formatExactDateTime(order.entregadoDate)}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <UpdateQuoteStatus workOrder={order} />
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Link href={`/work-orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="bg-transparent border-border/80 text-foreground hover:bg-card/50">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination for Completed Work Orders */}
            {totalCompletedPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <a
                    href={`/work-orders?${new URLSearchParams({
                      ...(query && { query }),
                      ...(activePage > 1 && { activePage: activePage.toString() }),
                      completedPage: Math.max(1, completedPage - 1).toString(),
                    }).toString()}`}
                    className={`px-4 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-lg hover:bg-card/80 transition-colors ${
                      completedPage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                  >
                    ← Anterior
                  </a>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalCompletedPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalCompletedPages - 4, completedPage - 2)) + i;
                      if (pageNum > totalCompletedPages) return null;

                      return (
                        <a
                          key={pageNum}
                          href={`/work-orders?${new URLSearchParams({
                            ...(query && { query }),
                            ...(activePage > 1 && { activePage: activePage.toString() }),
                            completedPage: pageNum.toString(),
                          }).toString()}`}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            pageNum === completedPage
                              ? 'bg-blue-600 text-foreground'
                              : 'text-foreground bg-card/50 border border-border/50 hover:bg-card/80'
                          }`}
                        >
                          {pageNum}
                        </a>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <a
                    href={`/work-orders?${new URLSearchParams({
                      ...(query && { query }),
                      ...(activePage > 1 && { activePage: activePage.toString() }),
                      completedPage: Math.min(totalCompletedPages, completedPage + 1).toString(),
                    }).toString()}`}
                    className={`px-4 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-lg hover:bg-card/80 transition-colors ${
                      completedPage === totalCompletedPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                  >
                    Siguiente →
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

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

  const [workOrdersData, motorcycles, technicians] = await Promise.all([
    getWorkOrders(),
    getMotorcycles(),
    getTechnicians(),
  ]);

  const workOrders = workOrdersData.items;
  
  // Filter all work orders
  const allActiveWorkOrders = workOrders.filter((wo) => wo.status !== 'Entregado');
  const allCompletedWorkOrders = workOrders.filter((wo) => wo.status === 'Entregado');
  
  // Pagination logic
  const itemsPerPage = 10;
  
  const totalActivePages = Math.ceil(allActiveWorkOrders.length / itemsPerPage) || 1;
  const activeWorkOrders = allActiveWorkOrders.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const totalCompletedPages = Math.ceil(allCompletedWorkOrders.length / itemsPerPage) || 1;
  const completedWorkOrders = allCompletedWorkOrders.slice((completedPage - 1) * itemsPerPage, completedPage * itemsPerPage);

  const motorcyclesWithoutActiveWorkOrders = motorcycles.filter(
    (moto) => !allActiveWorkOrders.some((wo) => wo.motorcycle?.id === moto.id)
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
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground text-muted-foreground mt-2">Rastrea y gestiona todos los trabajos en curso.</p>
        </div>
        <div className="flex gap-3 flex-grow sm:flex-grow-0">
          <SearchWorkOrders />
        </div>
        <div className="flex gap-3">
          <AddWorkOrder motorcycles={motorcyclesWithoutActiveWorkOrders} technicians={technicians} />
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
                    {format(new Date(order.motorcycle.intakeDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{order.technician?.name ?? 'Sin asignar'}</TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <Badge variant={getStatusVariant(order.status) as any}>
                        {order.status}
                      </Badge>
                      {order.diagnosticandoDate && (
                        <div className="text-xs text-muted-foreground">
                          {order.status === 'Diagnosticando' && `Desde: ${format(new Date(order.diagnosticandoDate), 'dd/MM')}`}
                          {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${format(new Date(order.reparadoDate), 'dd/MM')}`}
                          {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${format(new Date(order.entregadoDate), 'dd/MM')}`}
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
                        {format(new Date(order.motorcycle.intakeDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{order.technician?.name ?? 'Sin asignar'}</TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <Badge variant={getStatusVariant(order.status) as any}>
                            {order.status}
                          </Badge>
                          {order.diagnosticandoDate && (
                            <div className="text-xs text-muted-foreground">
                              {order.status === 'Diagnosticando' && `Desde: ${format(new Date(order.diagnosticandoDate), 'dd/MM')}`}
                              {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${format(new Date(order.reparadoDate), 'dd/MM')}`}
                              {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${format(new Date(order.entregadoDate), 'dd/MM')}`}
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

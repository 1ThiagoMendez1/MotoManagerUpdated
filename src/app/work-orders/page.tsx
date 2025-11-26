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
import { SearchWorkOrders } from '@/components/forms/SearchWorkOrders';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: { query?: string; page?: string };
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const currentPage = Number(resolvedSearchParams.page) || 1;

  const [workOrdersData, motorcycles, technicians] = await Promise.all([
    getWorkOrders({ query, page: currentPage, limit: 20 }),
    getMotorcycles(),
    getTechnicians(),
  ]);

  const workOrders = workOrdersData.items;
  const totalPages = workOrdersData.totalPages;
  const activeWorkOrders = workOrders.filter((wo) => wo.status !== 'Entregado');
  const completedWorkOrders = workOrders.filter((wo) => wo.status === 'Entregado');
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground text-white/80 mt-2">Rastrea y gestiona todos los trabajos en curso.</p>
        </div>
        <div className="flex gap-3 flex-grow sm:flex-grow-0">
          <SearchWorkOrders />
        </div>
        <div className="flex gap-3">
          <AddWorkOrder motorcycles={motorcycles} technicians={technicians} />
        </div>
      </div>
      <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Trabajos Activos</CardTitle>
          <CardDescription className="text-white/80 text-base">
            Todas las órdenes de trabajo actuales y pasadas. Página {currentPage} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableHead className="text-white/90 font-semibold">Número</TableHead>
                  <TableHead className="text-white/90 font-semibold">Motocicleta</TableHead>
                  <TableHead className="text-white/90 font-semibold">Fecha de Ingreso</TableHead>
                  <TableHead className="text-white/90 font-semibold">Técnico</TableHead>
                  <TableHead className="text-center text-white/90 font-semibold">Estado</TableHead>
                  <TableHead className="text-center text-white/90 font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {activeWorkOrders.map((order) => (
                <TableRow key={order.id} className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium">{order.workOrderNumber}</TableCell>
                  <TableCell className="font-medium">
                    <div>{order.motorcycle.make} {order.motorcycle.model}</div>
                    <div className="text-sm text-white/70">{order.motorcycle.customer.name}</div>
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
                        <div className="text-xs text-white/60">
                          {order.status === 'Diagnosticando' && `Desde: ${format(new Date(order.diagnosticandoDate), 'dd/MM')}`}
                          {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${format(new Date(order.reparadoDate), 'dd/MM')}`}
                          {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${format(new Date(order.entregadoDate), 'dd/MM')}`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Link href={`/work-orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                        <Eye className="h-4 w-4 mr-2" />
                        Gestionar
                      </Button>
                    </Link>
                    <UpdateWorkOrderStatus workOrder={order} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <a
                  href={`/work-orders?${new URLSearchParams({
                    ...(query && { query }),
                    page: Math.max(1, currentPage - 1).toString(),
                  }).toString()}`}
                  className={`px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                  }`}
                >
                  ← Anterior
                </a>

                {/* Page Numbers */}
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <a
                        key={pageNum}
                        href={`/work-orders?${new URLSearchParams({
                          ...(query && { query }),
                          page: pageNum.toString(),
                        }).toString()}`}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-white bg-white/10 border border-white/20 hover:bg-white/20'
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
                    page: Math.min(totalPages, currentPage + 1).toString(),
                  }).toString()}`}
                  className={`px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
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
        <Card className="mt-8 bg-white/5 border-white/20 text-white backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Trabajos Finalizados</CardTitle>
            <CardDescription className="text-white/80 text-base">
              Órdenes de trabajo que ya han sido entregadas al cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/10">
                    <TableHead className="text-white/90 font-semibold">Número</TableHead>
                    <TableHead className="text-white/90 font-semibold">Motocicleta</TableHead>
                    <TableHead className="text-white/90 font-semibold">Fecha de Ingreso</TableHead>
                    <TableHead className="text-white/90 font-semibold">Técnico</TableHead>
                    <TableHead className="text-center text-white/90 font-semibold">Estado</TableHead>
                    <TableHead className="text-center text-white/90 font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedWorkOrders.map((order) => (
                    <TableRow key={order.id} className="border-white/20 hover:bg-white/10">
                      <TableCell className="font-medium">{order.workOrderNumber}</TableCell>
                      <TableCell className="font-medium">
                        <div>{order.motorcycle.make} {order.motorcycle.model}</div>
                        <div className="text-sm text-white/70">{order.motorcycle.customer.name}</div>
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
                            <div className="text-xs text-white/60">
                              {order.status === 'Diagnosticando' && `Desde: ${format(new Date(order.diagnosticandoDate), 'dd/MM')}`}
                              {order.status === 'Reparado' && order.reparadoDate && `Reparado: ${format(new Date(order.reparadoDate), 'dd/MM')}`}
                              {order.status === 'Entregado' && order.entregadoDate && `Entregado: ${format(new Date(order.entregadoDate), 'dd/MM')}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Link href={`/work-orders/${order.id}`}>
                          <Button variant="outline" size="sm" className="bg-transparent border-white/30 text-white hover:bg-white/10">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

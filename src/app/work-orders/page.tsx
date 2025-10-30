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

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: { query?: string };
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';

  const [workOrders, motorcycles, technicians] = await Promise.all([
    getWorkOrders({ query }),
    getMotorcycles(),
    getTechnicians(),
  ]);
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
       <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-white">Órdenes de Trabajo</h1>
             <p className="text-muted-foreground text-white/80">Rastrea y gestiona todos los trabajos en curso.</p>
           </div>
           <div className="flex gap-2 flex-grow sm:flex-grow-0">
             <SearchWorkOrders />
           </div>
           <div className="flex gap-2">
             <AddWorkOrder motorcycles={motorcycles} technicians={technicians} />
           </div>
         </div>
      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle>Trabajos Activos</CardTitle>
          <CardDescription className="text-white/80">
            Una lista de todas las órdenes de trabajo actuales y pasadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10">
                <TableHead className="text-white/90">Número</TableHead>
                <TableHead className="text-white/90">Motocicleta</TableHead>
                <TableHead className="text-white/90">Fecha de Ingreso</TableHead>
                <TableHead className="text-white/90">Técnico</TableHead>
                <TableHead className="hidden md:table-cell text-white/90">Problema</TableHead>
                <TableHead className="text-center text-white/90">Estado</TableHead>
                <TableHead className="text-center text-white/90">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((order) => (
                <TableRow key={order.id} className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium">{order.workOrderNumber}</TableCell>
                  <TableCell className="font-medium">
                    <div>{order.motorcycle.make} {order.motorcycle.model}</div>
                    <div className="text-sm text-white/70">{order.motorcycle.customer.name}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(order.motorcycle.intakeDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{order.technician.name}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-sm truncate">
                    {order.issueDescription}
                  </TableCell>
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
                  <TableCell className="text-center">
                    <UpdateWorkOrderStatus workOrder={order} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

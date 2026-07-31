import { authorize } from '@/lib/auth-server';
import { getMotorcycles, getCustomers, getTechnicians, getWorkOrders } from '@/lib/data';

import type { Motorcycle, Customer, Technician } from '@/lib/types';
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
import { AddMotorcycle } from '@/components/forms/AddMotorcycle';
import { MotorcycleDetails } from '@/components/details/MotorcycleDetails';
import { SearchMotorcycles } from '@/components/forms/SearchMotorcycles';
import { ExportMotorcyclesButton } from '@/components/buttons/ExportMotorcyclesButton';
import { format } from 'date-fns';
import { Pagination } from '@/components/Pagination';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

export default async function MotorcyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string, page?: string }>;
}) {
  await authorize('/motorcycles');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const page = Number(resolvedSearchParams.page) || 1;

  const [motoResult, custResult, techResult, workOrdersData] = await Promise.all([
    getMotorcycles({ query, page }),
    getCustomers({ limit: 1000 } as any),
    getTechnicians({ limit: 1000 } as any),
    getWorkOrders({ limit: 1000 } as any),
  ]);

  const motorcycles = motoResult.items;
  const totalPages = motoResult.totalPages;

  const workOrders = workOrdersData.items;

  // Show motorcycles that do NOT have any work order.
  // Once a work order is created, the bike moves to the Work Orders module.
  const workOrderMotorcycleIds = new Set(
    workOrders
      .map((wo) => wo.motorcycle?.id)
      .filter(Boolean)
  );
  const motorcyclesInWorkshop = motorcycles.filter(
    (moto) => !workOrderMotorcycleIds.has(moto.id)
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Recepción de Motos</h1>
          <p className="text-muted-foreground">Motos ingresadas al taller sin orden de trabajo activa. Crea la orden para moverlas a gestión.</p>
        </div>
        <div className="flex gap-2 flex-grow sm:flex-grow-0">
          <SearchMotorcycles />
        </div>
        <div className="flex gap-2">
          <ExportMotorcyclesButton motorcycles={motorcyclesInWorkshop} />
          <AddMotorcycle />
        </div>
      </div>
      <Card className="glass-card relative overflow-hidden group text-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle>Motos Pendientes de Orden</CardTitle>
          <CardDescription className="text-muted-foreground">
            Motos registradas en el taller que todavía no tienen una orden de trabajo activa asignada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-foreground/90">Marca y Modelo</TableHead>
                <TableHead className="text-foreground/90">Placa</TableHead>
                <TableHead className="hidden md:table-cell text-foreground/90">Cliente</TableHead>
                <TableHead className="hidden md:table-cell text-foreground/90">Fecha de Ingreso</TableHead>
                <TableHead className="hidden lg:table-cell text-foreground/90">Reporte del Cliente</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motorcyclesInWorkshop.map((moto) => (
                <TableRow key={moto.id} className="border-border/50 hover:bg-primary/5 transition-colors">
                  <TableCell className="font-medium">
                    <div>{moto.make} {moto.model}</div>
                    <div className="text-sm text-muted-foreground">{moto.year}</div>
                  </TableCell>
                  <TableCell className="font-mono">{moto.plate}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>{moto.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{moto.customer.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{format(new Date(moto.intakeDate), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-xs truncate" title={moto.issueDescription || 'Sin descripción'}>
                      {moto.issueDescription || 'Sin descripción'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <MotorcycleDetails
                      motorcycle={moto}
                      workOrders={workOrders.filter(wo => wo.motorcycle && wo.motorcycle.id === moto.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

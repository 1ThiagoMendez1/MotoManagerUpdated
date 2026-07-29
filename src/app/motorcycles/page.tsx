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

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

export default async function MotorcyclesPage({
  searchParams,
}: {
  searchParams: { query?: string };
}) {
  await authorize('/motorcycles');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';

  const [motorcycles, customers, technicians, workOrdersData] = await Promise.all([
    getMotorcycles({ query }),
    getCustomers(),
    getTechnicians(),
    getWorkOrders(),
  ]);

  const workOrders = workOrdersData.items;

  // Filtrar motocicletas que tengan una orden de trabajo activa (estado distinto de "Entregado", es decir, que están en el taller)
  const activeWorkOrders = workOrders.filter((wo) => wo.status !== 'Entregado');
  const motorcyclesInWorkshop = motorcycles.filter(
    (moto) => activeWorkOrders.some((wo) => wo.motorcycle && wo.motorcycle.id === moto.id)
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Motos en Taller</h1>
          <p className="text-muted-foreground">Gestiona las motocicletas que se encuentran físicamente en el taller.</p>
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
          <CardTitle>Motocicletas en el Taller</CardTitle>
          <CardDescription className="text-muted-foreground">
            Una lista de todas las motocicletas que se encuentran en el taller en proceso de revisión o reparación.
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
        </CardContent>
      </Card>
    </div>
  );
}

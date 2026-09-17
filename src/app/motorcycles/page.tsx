import { authorize } from '@/lib/auth-server';
import { getMotorcycles, getCustomers, getTechnicians, getWorkOrders } from '@/lib/data';
import type { Motorcycle, Customer, Technician } from '@/lib/types';
import {
  Card,
  CardContent,
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
import { formatExactDateTime } from '@/lib/dateUtils';
import { Pagination } from '@/components/Pagination';
import { Bike } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';

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
  const workOrderMotorcycleIds = new Set(
    workOrders
      .map((wo) => wo.motorcycle?.id)
      .filter(Boolean)
  );
  const motorcyclesInWorkshop = motorcycles.filter(
    (moto) => !workOrderMotorcycleIds.has(moto.id)
  );

  return (
    <div className="w-full space-y-4">
      {/* Header Estandarizado */}
      <PageHeader
        title="Recepción de Motos"
        description="Motos ingresadas en taller pendientes de crear u ordenar trabajo."
        icon={Bike}
        iconBg="bg-primary/10 text-primary"
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
            {motorcyclesInWorkshop.length} en espera
          </span>
        }
      />

      {/* Toolbar con Búsqueda, Exportación y Registro */}
      <ModuleToolbar
        searchComponent={<SearchMotorcycles />}
        primaryAction={<AddMotorcycle technicians={techResult.items} />}
        secondaryActions={[
          { label: 'Exportar Motos en Espera', component: <ExportMotorcyclesButton motorcycles={motorcyclesInWorkshop} /> }
        ]}
      />

      {/* Tabla de Motocicletas de Alta Densidad */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3 pl-4">Placa</TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Marca y Modelo</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Fecha Ingreso</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Motivo / Reporte</TableHead>
                  <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Historial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motorcyclesInWorkshop.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No hay motocicletas pendientes de orden en este momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  motorcyclesInWorkshop.map((moto) => (
                    <TableRow key={moto.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-2.5 pl-4">
                        <span className="font-mono font-bold text-xs bg-muted px-2 py-1 rounded text-foreground border border-border/50">
                          {moto.plate || 'S/P'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-foreground text-sm leading-tight">
                          {moto.make} {moto.model}
                        </div>
                        {moto.year > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">Modelo {moto.year}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2.5">
                        <div className="font-medium text-foreground text-xs sm:text-sm">{moto.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{moto.customer.phone || '—'}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap py-2.5">
                        {formatExactDateTime(moto.intakeDate)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate py-2.5" title={moto.issueDescription || 'Sin descripción'}>
                        {moto.issueDescription || 'Sin reporte inicial'}
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <div className="flex justify-end">
                          <MotorcycleDetails
                            motorcycle={moto}
                            workOrders={workOrders.filter(wo => wo.motorcycle && wo.motorcycle.id === moto.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="p-3 border-t border-border/50 flex justify-center bg-muted/10">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

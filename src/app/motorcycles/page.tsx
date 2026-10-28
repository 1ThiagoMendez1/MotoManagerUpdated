import { authorize } from '@/lib/auth-server';
import { getTechnicians } from '@/lib/data';
import { getMotorcycleOrderList } from '@/lib/motorcycle-order-list';
import { motorcycleMatchesTab, type MotorcycleTab } from '@/lib/motorcycle-order-groups';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
  searchParams: Promise<{ query?: string, page?: string, estado?: string }>;
}) {
  const user = await authorize('/motorcycles');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const requestedPage = Math.max(1, Number(resolvedSearchParams.page) || 1);
  const estado: MotorcycleTab = (
    ['without', 'active', 'finished'].includes(resolvedSearchParams.estado || '')
      ? resolvedSearchParams.estado as MotorcycleTab
      : 'all'
  );

  const [motorcycleData, techResult] = await Promise.all([
    getMotorcycleOrderList(query, user.workshopId!),
    getTechnicians({ limit: 1000 }),
  ]);

  const { motorcycles: allMotorcycles, orderIndex } = motorcycleData;
  const tabs: { value: MotorcycleTab; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'without', label: 'Sin orden' },
    { value: 'active', label: 'Con orden activa' },
    { value: 'finished', label: 'Finalizadas' },
  ];
  const counts = {
    all: allMotorcycles.length,
    without: allMotorcycles.filter(moto => motorcycleMatchesTab(moto.id, 'without', orderIndex)).length,
    active: allMotorcycles.filter(moto => motorcycleMatchesTab(moto.id, 'active', orderIndex)).length,
    finished: allMotorcycles.filter(moto => motorcycleMatchesTab(moto.id, 'finished', orderIndex)).length,
  };
  const filteredMotorcycles = allMotorcycles.filter(
    moto => motorcycleMatchesTab(moto.id, estado, orderIndex),
  );
  const pageSize = 10;
  const totalPages = Math.ceil(filteredMotorcycles.length / pageSize);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const motorcycles = filteredMotorcycles.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full space-y-4">
      {/* Header Estandarizado */}
      <PageHeader
        title="Motocicletas registradas"
        description="Consulta motos sin orden, en proceso y finalizadas, sin perder el historial."
        icon={Bike}
        iconBg="bg-primary/10 text-primary"
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
            {filteredMotorcycles.length} {filteredMotorcycles.length === 1 ? 'motocicleta' : 'motocicletas'}
          </span>
        }
      />

      {/* Toolbar con Búsqueda, Exportación y Registro */}
      <ModuleToolbar
        searchComponent={<SearchMotorcycles />}
        primaryAction={<AddMotorcycle technicians={techResult.items} />}
        secondaryActions={[
          { label: 'Exportar motos de esta página', component: <ExportMotorcyclesButton motorcycles={motorcycles} /> }
        ]}
      />

      {/* Filtros globales: los conteos se calculan antes de paginar. */}
      <nav aria-label="Clasificar motocicletas por estado de orden" className="flex flex-wrap items-center gap-2">
        {tabs.map(tab => {
          const params = new URLSearchParams();
          if (query) params.set('query', query);
          if (tab.value !== 'all') params.set('estado', tab.value);
          const href = params.toString() ? `/motorcycles?${params.toString()}` : '/motorcycles';
          return (
            <Link
              key={tab.value}
              href={href}
              aria-current={estado === tab.value ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                estado === tab.value
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">{counts[tab.value]}</span>
            </Link>
          );
        })}
      </nav>

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
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Estado de orden</TableHead>
                  <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Historial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motorcycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      No hay motocicletas en esta categoría. Prueba otra pestaña o borra la búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  motorcycles.map((moto) => {
                    const currentOrder = orderIndex.get(moto.id);
                    return (
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
                      <TableCell className="py-2.5">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={currentOrder ? (currentOrder.tab === 'active' ? 'default' : 'secondary') : 'outline'}>
                            {currentOrder?.label || 'Sin orden'}
                          </Badge>
                          {currentOrder && (
                            <Link href={`/work-orders/${currentOrder.id}`} className="text-xs text-primary hover:underline">
                              Ver orden {currentOrder.orderNumber ? `#${currentOrder.orderNumber}` : ''}
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <div className="flex justify-end">
                          <MotorcycleDetails
                            motorcycle={moto}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
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

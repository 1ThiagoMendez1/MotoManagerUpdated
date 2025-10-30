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
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';

  const [motorcycles, customers, technicians, workOrders] = await Promise.all([
    getMotorcycles({ query }),
    getCustomers(),
    getTechnicians(),
    getWorkOrders(),
  ]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Recepción de Motocicletas</h1>
          <p className="text-muted-foreground text-white/80">Gestiona todos los registros de motocicletas.</p>
        </div>
        <div className="flex gap-2 flex-grow sm:flex-grow-0">
          <SearchMotorcycles />
        </div>
        <div className="flex gap-2">
          <ExportMotorcyclesButton motorcycles={motorcycles} />
          <AddMotorcycle />
        </div>
      </div>
      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle>Motocicletas Registradas</CardTitle>
          <CardDescription className="text-white/80">
            Una lista de todas las motocicletas registradas en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10">
                <TableHead className="text-white/90">Marca y Modelo</TableHead>
                <TableHead className="text-white/90">Placa</TableHead>
                <TableHead className="hidden md:table-cell text-white/90">Cliente</TableHead>
                <TableHead className="hidden md:table-cell text-white/90">Fecha de Ingreso</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motorcycles.map((moto) => (
                <TableRow key={moto.id} className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium">
                    <div>{moto.make} {moto.model}</div>
                    <div className="text-sm text-white/70">{moto.year}</div>
                  </TableCell>
                  <TableCell className="font-mono">{moto.plate}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>{moto.customer.name}</div>
                    <div className="text-sm text-white/70">{moto.customer.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{format(new Date(moto.intakeDate), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    <MotorcycleDetails
                      motorcycle={moto}
                      workOrders={workOrders.filter(wo => wo.motorcycle.id === moto.id)}
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

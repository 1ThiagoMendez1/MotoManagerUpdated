import { getCustomers } from '@/lib/data';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
import type { Customer } from '@/lib/types';
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
import { AddCustomer } from '@/components/forms/AddCustomer';
import { EditCustomer } from '@/components/forms/EditCustomer';
import { DeleteCustomer } from '@/components/forms/DeleteCustomer';

export default async function CustomersPage() {
  let customers: Customer[] = [];
  try {
    customers = await getCustomers();
  } catch (error) {
    console.error('Error fetching customers:', error);
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground text-white/80">Gestiona todos los clientes registrados.</p>
        </div>
        <AddCustomer />
      </div>
      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Lista de Clientes</CardTitle>
          <CardDescription className="text-white/80 text-sm sm:text-base">
            Una lista de todos los clientes registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableHead className="text-white/90 text-xs sm:text-sm">Nombre</TableHead>
                  <TableHead className="text-white/90 text-xs sm:text-sm">Email</TableHead>
                  <TableHead className="hidden md:table-cell text-white/90 text-xs sm:text-sm">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell text-white/90 text-xs sm:text-sm">Cédula</TableHead>
                  <TableHead className="text-center text-white/90 text-xs sm:text-sm">Estado</TableHead>
                  <TableHead className="text-right text-white/90 text-xs sm:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="border-white/20 hover:bg-white/10">
                    <TableCell className="font-medium text-xs sm:text-sm">{customer.name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{customer.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{customer.phone || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{customer.cedula || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      {customer.isFrequent ? (
                        <Badge variant="secondary" className="text-xs">Frecuente</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <EditCustomer customer={customer} />
                        <DeleteCustomer customer={customer} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {customers.length === 0 && (
            <div className="text-center py-10 text-white/70">
              No se encontraron clientes registrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
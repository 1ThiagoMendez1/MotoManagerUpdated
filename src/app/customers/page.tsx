import { authorize } from '@/lib/auth-server';
import { getCustomers } from '@/lib/data';
import type { Customer } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { AddCustomer } from '@/components/forms/AddCustomer';
import { ImportCustomers } from '@/components/forms/ImportCustomers';
import { EditCustomer } from '@/components/forms/EditCustomer';
import { DeleteCustomer } from '@/components/forms/DeleteCustomer';
import { CustomerDetails } from '@/components/details/CustomerDetails';
import { Users } from 'lucide-react';
import { SearchCustomers } from '@/components/forms/SearchCustomers';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string, page?: string }>;
}) {
  await authorize('/customers');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query || '';
  const page = Number(resolvedSearchParams?.page) || 1;

  let customers: Customer[] = [];
  let totalPages = 0;
  try {
    const result = await getCustomers({ query, page });
    customers = result.items;
    totalPages = result.totalPages;
  } catch (error) {
    console.error('Error fetching customers:', error);
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Estandarizado */}
      <PageHeader
        title="Directorio de Clientes"
        description="Gestiona los clientes registrados, sus datos de contacto y trazabilidad."
        icon={Users}
        iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
            {customers.length} clientes
          </span>
        }
      />

      {/* Toolbar con Búsqueda e Importación */}
      <ModuleToolbar
        searchComponent={<SearchCustomers />}
        primaryAction={<AddCustomer />}
        secondaryActions={[
          { label: 'Importar Clientes (Excel/CSV)', component: <ImportCustomers /> }
        ]}
      />

      {/* Tabla de Clientes de Alta Densidad */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3 pl-4">Nombre</TableHead>
                  <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Email</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cédula / NIT</TableHead>
                  <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3">Tipo</TableHead>
                  <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No se encontraron clientes con este criterio.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground text-sm py-2.5 pl-4">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs py-2.5">
                        {customer.email || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-foreground font-medium text-xs py-2.5">
                        {customer.phone || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-xs py-2.5">
                        {customer.cedula || '—'}
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        {customer.isFrequent ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0.5">
                            Frecuente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50 text-[10px] font-medium py-0.5">
                            Regular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <div className="flex gap-1 justify-end items-center">
                          <CustomerDetails customer={customer} />
                          <EditCustomer customer={customer} />
                          <DeleteCustomer customer={customer} />
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
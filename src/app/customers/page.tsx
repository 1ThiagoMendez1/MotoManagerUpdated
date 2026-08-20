import { authorize } from '@/lib/auth-server';
import { getCustomers } from '@/lib/data';


// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
import type { Customer } from '@/lib/types';
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
import { cn } from '@/lib/utils';
import { SearchCustomers } from '@/components/forms/SearchCustomers';
import { Pagination } from '@/components/Pagination';

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
    <div className="w-full relative z-10">
      
      {/* Background orbs específicos para esta vista (opcional, pero ayuda al glass) */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 lg:mb-10 mt-2 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-2">Clientes</h1>
          <p className="text-base sm:text-lg text-foreground/70">
            Directorio y gestión de contactos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <SearchCustomers />
          <ImportCustomers />
          <AddCustomer />
        </div>
      </div>

      {/* Main Liquid Glass Container */}
      <div className="relative rounded-[32px] bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Glow effect inside container */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 border-b border-foreground/[0.08] dark:border-white/[0.1] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Lista de Clientes</h2>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">
            Todos los clientes registrados en el sistema del taller.
          </p>
        </div>
        
        <div className="relative z-10 p-4 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-foreground/[0.08] dark:border-white/[0.1] hover:bg-transparent">
                  <TableHead className="text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Nombre</TableHead>
                  <TableHead className="text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Email</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Cédula</TableHead>
                  <TableHead className="text-center text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Estado</TableHead>
                  <TableHead className="text-right text-foreground/70 font-semibold text-xs sm:text-sm uppercase tracking-wider h-12">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="border-foreground/[0.05] dark:border-white/[0.05] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.04] transition-colors duration-200">
                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm py-4">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm py-4">{customer.email || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs sm:text-sm py-4">{customer.phone || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs sm:text-sm py-4">{customer.cedula || '—'}</TableCell>
                    <TableCell className="text-center py-4">
                      {customer.isFrequent ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none px-3 py-1 text-xs font-semibold rounded-full shadow-none hover:bg-emerald-500/25">Frecuente</Badge>
                      ) : (
                        <Badge className="bg-foreground/5 text-foreground/70 border-none px-3 py-1 text-xs font-medium rounded-full shadow-none hover:bg-foreground/10">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex gap-1 sm:gap-2 justify-end">
                        <CustomerDetails customer={customer} />
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
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-foreground/40" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Sin clientes</h3>
              <p className="text-muted-foreground text-sm max-w-sm">No se encontraron clientes registrados en el sistema. Puedes empezar añadiendo uno nuevo.</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 border-t border-foreground/[0.08] dark:border-white/[0.1] pt-4">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
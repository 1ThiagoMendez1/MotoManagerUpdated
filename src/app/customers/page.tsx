import { authorize } from '@/lib/auth-server';
import { getCustomers } from '@/lib/data';
import type { Customer } from '@/lib/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { AddCustomer } from '@/components/forms/AddCustomer';
import { ImportCustomers } from '@/components/forms/ImportCustomers';
import { Users } from 'lucide-react';
import { SearchCustomers } from '@/components/forms/SearchCustomers';
import { CustomerTable } from '@/components/customers/CustomerTable';
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
          <CustomerTable customers={customers} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  );
}
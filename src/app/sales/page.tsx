import { authorize } from '@/lib/auth-server';
import { getSales, getWorkOrders, getInventory, getCustomers } from '@/lib/data';
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
import { formatExactDateTime } from '@/lib/dateUtils';
import { ExportSalesButton } from '@/components/buttons/ExportSalesButton';
import { SalesFilters } from '@/components/SalesFilters';
import { ExportDirectSalesButton } from '@/components/buttons/ExportDirectSalesButton';
import { ExportServiceSalesButton } from '@/components/buttons/ExportServiceSalesButton';
import { AddSale } from '@/components/forms/AddSale';
import { AddDirectSale } from '@/components/forms/AddDirectSale';
import { SaleDetails } from '@/components/details/SaleDetails';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';
import type { Sale, InventoryItem } from '@/lib/types';

// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPaymentMethodBadge(method?: string) {
  if (!method) return <Badge variant="outline" className="text-[10px]">Otros</Badge>;
  
  const m = method.toLowerCase();
  if (m === 'cash' || m === 'efectivo') {
    return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">Efectivo</Badge>;
  }
  if (m === 'credit_card' || m === 'debit_card' || m === 'tarjeta') {
    return <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">Tarjeta</Badge>;
  }
  if (m === 'transfer' || m === 'transferencia' || m === 'nequi' || m === 'daviplata') {
    const label = m === 'nequi' ? 'Nequi' : m === 'daviplata' ? 'DaviPlata' : (m === 'transfer' ? 'Transferencia' : method);
    return <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">{label}</Badge>;
  }
  if (m === 'wompi') {
    return <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-500 bg-indigo-500/10">Wompi</Badge>;
  }
  
  return <Badge variant="outline" className="text-[10px]">{method}</Badge>;
}

function SalesPageError({ error }: { error: string }) {
  return (
    <div className="w-full">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las ventas: {error}. Por favor, intente de nuevo.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    page?: string;
  }>;
}) {
  const user = await authorize('/sales');
  const resolvedSearchParams = await searchParams;
  const dateFrom = resolvedSearchParams.dateFrom || '';
  const dateTo = resolvedSearchParams.dateTo || '';
  const type = resolvedSearchParams.type as 'direct' | 'service' | 'all' || 'all';
  const currentPage = Number(resolvedSearchParams.page) || 1;

  const { getServices } = await import('@/actions/services');

  try {
    const [sls, wos, inv, custs, allSales, servicesResult] = await Promise.all([
      getSales({ dateFrom, dateTo, type, page: currentPage, limit: 10 } as any),
      getWorkOrders({ limit: 200 }),
      getInventory({ limit: 200 } as any),
      getCustomers(),
      getSales({ dateFrom, dateTo, type, limit: 1000 } as any),
      getServices(user.workshopId),
    ]);

    const sales = sls.items;
    const totalPages = sls.totalPages;
    const workOrders = wos.items || wos;
    const inventoryItems = inv.items as InventoryItem[];
    const customers = (custs as any).items || custs;
    const allFilteredSales = allSales.items;
    const services = servicesResult || [];

    const getSaleDetails = (sale: Sale) => {
      if (sale.workOrderId && sale.workOrder) {
        return sale.workOrder.issueDescription;
      }
      if (sale.items && sale.items.length > 0) {
        const firstItem = inventoryItems.find(invItem => invItem.id === sale.items![0].inventoryItemId);
        if (!firstItem) return "Venta de mostrador";

        let details = firstItem.name;
        if (sale.items.length > 1) {
          details += ` (+${sale.items.length - 1} más)`;
        }
        return details;
      }
      return "Venta general";
    };

    return (
      <div className="w-full space-y-4">
        {/* Header Estandarizado */}
        <PageHeader
          title="Ventas & Facturación"
          description="Historial completo de ventas de mostrador y facturación de órdenes de trabajo."
          icon={ShoppingCart}
          badge={
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              {sales.length} registros
            </span>
          }
        />

        {/* Toolbar con Filtros y Agrupación de Creación y Exportaciones */}
        <ModuleToolbar
          searchComponent={
            <SalesFilters currentDateFrom={dateFrom} currentDateTo={dateTo} currentType={type} />
          }
          primaryAction={
            <div className="flex items-center gap-2">
              <AddDirectSale inventory={inventoryItems} customers={customers} services={services} />
              <AddSale workOrders={workOrders} inventory={inventoryItems} />
            </div>
          }
          secondaryActions={[
            { label: 'Exportar Ventas Directas', component: <ExportDirectSalesButton sales={allFilteredSales.filter(s => !s.workOrderId)} /> },
            { label: 'Exportar Ventas por Servicio', component: <ExportServiceSalesButton sales={allFilteredSales.filter(s => s.workOrderId)} /> },
            { label: 'Exportar Todo el Historial', component: <ExportSalesButton sales={allFilteredSales} /> }
          ]}
        />

        {/* Tabla de Alta Densidad */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                    <TableHead className="w-[100px] text-foreground font-semibold text-xs uppercase tracking-wider py-3">N° Venta</TableHead>
                    <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Tipo</TableHead>
                    <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cliente / Vehículo</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Detalles</TableHead>
                    <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Fecha</TableHead>
                    <TableHead className="hidden sm:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Pago</TableHead>
                    <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3">Total</TableHead>
                    <TableHead className="text-center text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        No se encontraron ventas registradas con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-xs sm:text-sm text-foreground py-2.5">
                          #{sale.saleNumber}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {sale.workOrderId ? (
                            <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                              Servicio
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/10">
                              Mostrador
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {sale.workOrderId && sale.workOrder ? (
                            <div>
                              <div className="font-semibold text-foreground text-sm leading-tight">
                                {sale.workOrder.motorcycle.customer.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {sale.workOrder.motorcycle.make} {sale.workOrder.motorcycle.model}
                              </div>
                            </div>
                          ) : (
                            <div className="font-semibold text-foreground text-sm">
                              {sale.customer?.name || sale.customerName || 'Cliente de Mostrador'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate py-2.5">
                          {getSaleDetails(sale)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5">
                          {formatExactDateTime(sale.date)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-2.5">
                          {getPaymentMethodBadge(sale.paymentMethod)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-foreground py-2.5 font-mono">
                          {formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell className="text-center py-2.5 pr-4">
                          <SaleDetails sale={sale} inventoryItems={inventoryItems} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border/50 flex justify-center bg-muted/10">
                <div className="flex items-center space-x-1.5 text-xs font-medium">
                  <a
                    href={`/sales?${new URLSearchParams({
                      ...(dateFrom && { dateFrom }),
                      ...(dateTo && { dateTo }),
                      ...(type !== 'all' && { type }),
                      page: Math.max(1, currentPage - 1).toString(),
                    }).toString()}`}
                    className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                      currentPage === 1 ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    ← Anterior
                  </a>
                  <span className="px-3 py-1 text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <a
                    href={`/sales?${new URLSearchParams({
                      ...(dateFrom && { dateFrom }),
                      ...(dateTo && { dateTo }),
                      ...(type !== 'all' && { type }),
                      page: Math.min(totalPages, currentPage + 1).toString(),
                    }).toString()}`}
                    className={`px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card transition-colors ${
                      currentPage === totalPages ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    Siguiente →
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error loading sales data:', error);
    return (
      <SalesPageError
        error={error instanceof Error ? error.message : 'Error desconocido'}
      />
    );
  }
}

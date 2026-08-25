import { authorize } from '@/lib/auth-server';
import { getSales, getWorkOrders, getInventory, getCustomers } from '@/lib/data';


// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
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
import { formatExactDateTime } from '@/lib/dateUtils';
import { ExportSalesButton } from '@/components/buttons/ExportSalesButton';
import { SalesFilters } from '@/components/SalesFilters';
import { SalesPagination } from '@/components/SalesPagination';
import { ExportDirectSalesButton } from '@/components/buttons/ExportDirectSalesButton';
import { ExportServiceSalesButton } from '@/components/buttons/ExportServiceSalesButton';
import { AddSale } from '@/components/forms/AddSale';
import { AddDirectSale } from '@/components/forms/AddDirectSale';
import { SaleDetails } from '@/components/details/SaleDetails';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sale, InventoryItem } from '@/lib/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPaymentMethodBadge(method?: string) {
  if (!method) return <Badge variant="outline" className="text-xs">Otros</Badge>;
  
  const m = method.toLowerCase();
  if (m === 'cash' || m === 'efectivo') {
    return <Badge variant="outline" className="text-xs border-green-500/30 text-green-500 bg-green-500/10">Efectivo</Badge>;
  }
  if (m === 'credit_card' || m === 'debit_card' || m === 'tarjeta') {
    return <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-500 bg-purple-500/10">Tarjeta</Badge>;
  }
  if (m === 'transfer' || m === 'transferencia' || m === 'nequi' || m === 'daviplata') {
    // If it's a specific app, capitalize it, otherwise just show the method name
    const label = m === 'nequi' ? 'Nequi' : m === 'daviplata' ? 'DaviPlata' : (m === 'transfer' ? 'Transferencia' : method);
    return <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500 bg-blue-500/10">{label}</Badge>;
  }
  if (m === 'wompi') {
    return <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-500 bg-indigo-500/10">Wompi</Badge>;
  }
  
  return <Badge variant="outline" className="text-xs">{method}</Badge>;
}


// Loading component
function SalesPageSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Card className="glass-card text-foreground">
        <CardHeader>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error component
function SalesPageError({ error }: { error: string }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Ventas</h1>
          <p className="text-muted-foreground text-muted-foreground">Revisa todas las ventas y transacciones.</p>
        </div>
      </div>
      <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
        <AlertDescription>
          Error al cargar los datos de ventas: {error}
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

  // Needed for getServices
  const { getServices } = await import('@/actions/services');

  try {
    const [sls, wos, inv, custs, allSales, servicesResult] = await Promise.all([
      getSales({ dateFrom, dateTo, type, page: currentPage, limit: 10 } as any),
      getWorkOrders({ limit: 200 }), // Get all work orders for forms
      getInventory({ limit: 200 } as any),
      getCustomers(),
      getSales({ dateFrom, dateTo, type, limit: 1000 } as any), // For export
      getServices(user.workshopId),
    ]);

    const sales = sls.items;
    const totalPages = sls.totalPages;
    const workOrders = wos.items || wos; // Handle both paginated and non-paginated responses
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
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Ventas</h1>
            <p className="text-sm sm:text-base text-muted-foreground text-muted-foreground">Revisa todas las ventas y transacciones.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
              <SalesFilters currentDateFrom={dateFrom} currentDateTo={dateTo} currentType={type} />
              <AddSale workOrders={workOrders} inventory={inventoryItems} />
              <AddDirectSale inventory={inventoryItems} customers={customers} services={services} />
              <ExportDirectSalesButton sales={allFilteredSales.filter(s => !s.workOrderId)} />
              <ExportServiceSalesButton sales={allFilteredSales.filter(s => s.workOrderId)} />
          </div>
        </div>
        <Card className="glass-card relative overflow-hidden group text-foreground glow-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg sm:text-xl">Historial de Transacciones</CardTitle>
            <CardDescription className="text-muted-foreground text-sm sm:text-base">
              Un registro detallado de todas las ventas completadas. Página {currentPage} de {totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-foreground/90 text-xs sm:text-sm">Número</TableHead>
                    <TableHead className="text-foreground/90 text-xs sm:text-sm">Tipo</TableHead>
                    <TableHead className="text-foreground/90 text-xs sm:text-sm">Cliente / Vehículo</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground/90 text-xs sm:text-sm">Detalles</TableHead>
                    <TableHead className="text-foreground/90 text-xs sm:text-sm">Fecha</TableHead>
                    <TableHead className="hidden sm:table-cell text-foreground/90 text-xs sm:text-sm">Pago</TableHead>
                    <TableHead className="text-right text-foreground/90 text-xs sm:text-sm">Total</TableHead>
                    <TableHead className="text-center text-foreground/90 text-xs sm:text-sm">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="border-border/50 hover:bg-primary/5 transition-colors">
                      <TableCell className="font-medium text-xs sm:text-sm">{sale.saleNumber}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {sale.workOrderId ? (
                          <Badge variant="secondary" className="text-xs">Servicio</Badge>
                        ) : (
                          <Badge className="text-xs">Mostrador</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {sale.workOrderId && sale.workOrder ? (
                          <>
                            <div>{sale.workOrder.motorcycle.customer.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {sale.workOrder.motorcycle.make} {sale.workOrder.motorcycle.model}
                            </div>
                          </>
                        ) : (
                          <div>{sale.customer?.name || sale.customerName || 'Cliente de Mostrador'}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm text-muted-foreground max-w-xs truncate">
                        {getSaleDetails(sale)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatExactDateTime(sale.date)}</TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        {getPaymentMethodBadge(sale.paymentMethod)}
                      </TableCell>

                      <TableCell className="text-right font-medium text-xs sm:text-sm">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-center">
                        <SaleDetails sale={sale} inventoryItems={inventoryItems} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <a
                    href={`/sales?${new URLSearchParams({
                      ...(dateFrom && { dateFrom }),
                      ...(dateTo && { dateTo }),
                      ...(type !== 'all' && { type }),
                      page: Math.max(1, currentPage - 1).toString(),
                    }).toString()}`}
                    className={`px-3 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-md hover:bg-card/80 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                  >
                    ← Anterior
                  </a>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <a
                          key={pageNum}
                          href={`/sales?${new URLSearchParams({
                            ...(dateFrom && { dateFrom }),
                            ...(dateTo && { dateTo }),
                            ...(type !== 'all' && { type }),
                            page: pageNum.toString(),
                          }).toString()}`}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            pageNum === currentPage
                              ? 'bg-blue-600 text-foreground'
                              : 'text-foreground bg-card/50 border border-border/50 hover:bg-card/80'
                          }`}
                        >
                          {pageNum}
                        </a>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <a
                    href={`/sales?${new URLSearchParams({
                      ...(dateFrom && { dateFrom }),
                      ...(dateTo && { dateTo }),
                      ...(type !== 'all' && { type }),
                      page: Math.min(totalPages, currentPage + 1).toString(),
                    }).toString()}`}
                    className={`px-3 py-2 text-sm font-medium text-foreground bg-card/50 border border-border/50 rounded-md hover:bg-card/80 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
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

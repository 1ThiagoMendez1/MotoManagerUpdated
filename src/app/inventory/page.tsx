import { authorize } from '@/lib/auth-server';
import { getInventory } from '@/lib/data';


// Force dynamic rendering to avoid database connection during build
export const dynamic = 'force-dynamic';
import type { InventoryItem } from '@/lib/types';
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
import { cn } from '@/lib/utils';
import { AddInventoryItem } from '@/components/forms/AddInventoryItem';
import { EditInventoryItem } from '@/components/forms/EditInventoryItem';
import { DeleteInventoryItem } from '@/components/forms/DeleteInventoryItem';
import { ExportInventoryButton } from '@/components/buttons/ExportInventoryButton';
import { ExportLowStockButton } from '@/components/buttons/ExportLowStockButton';
import { SearchInventory } from '@/components/forms/SearchInventory';
import { CategoryFilter } from '@/components/CategoryFilter';
import { Pagination } from '@/components/Pagination';
import { NotifyAdminLowStockButton } from '@/components/buttons/NotifyAdminLowStockButton';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
}

const ITEMS_PER_PAGE = 10;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const user = await authorize('/inventory');
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const category = resolvedSearchParams.category || '';
  const currentPage = Number(resolvedSearchParams.page) || 1;

  const [paginated, full] = await Promise.all([
    getInventory({ query, category, page: currentPage, limit: ITEMS_PER_PAGE } as any),
    getInventory({ limit: 1000 } as any), // Fetch all for export
  ]);

  const inventory = paginated.items;
  const totalPages = paginated.totalPages;
  const allInventory = full.items;

  const hasLowStock = allInventory.some(item => item.quantity <= item.minimumQuantity);
  const isTechnician = user.role === 'mechanic' || user.role === 'Técnico';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="text-muted-foreground text-muted-foreground">Gestiona tus repuestos y suministros.</p>
        </div>
        <div className="flex gap-2 flex-grow sm:flex-grow-0">
            <SearchInventory placeholder="Buscar por nombre o SKU..." />
            <CategoryFilter currentCategory={category} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
            {isTechnician && <NotifyAdminLowStockButton hasLowStock={hasLowStock} />}
            <ExportInventoryButton inventory={allInventory} />
            <ExportLowStockButton inventory={allInventory} />
            <AddInventoryItem />
        </div>
      </div>
      <Card className="glass-card relative overflow-hidden group text-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle>Repuestos y Suministros</CardTitle>
          <CardDescription className="text-muted-foreground">
            Una lista de todos los artículos en tu inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-foreground/90">Nombre del Artículo</TableHead>
                <TableHead className="hidden md:table-cell text-foreground/90">Categoría</TableHead>
                <TableHead className="hidden lg:table-cell text-foreground/90">Ubicación</TableHead>
                <TableHead className="text-right text-foreground/90">Cantidad</TableHead>
                <TableHead className="hidden md:table-cell text-right text-foreground/90">Precio</TableHead>
                <TableHead className="text-center text-foreground/90">Estado</TableHead>
                <TableHead className="text-right text-foreground/90 hidden md:table-cell">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const isLowStock = item.quantity <= item.minimumQuantity;
                return (
                  <TableRow key={item.id} className={cn('border-border/50 hover:bg-primary/5 transition-colors', isLowStock && 'bg-destructive/20 hover:bg-destructive/30')}>
                    <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{item.sku}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                    <TableCell className="hidden lg:table-cell">{item.location}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-center">
                        {isLowStock ? (
                             <Badge variant="destructive">Bajo Stock</Badge>
                        ) : (
                             <Badge variant="secondary">En Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <div className="flex gap-2 justify-end">
                          <EditInventoryItem item={item} />
                        </div>
                      </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
           {inventory.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron artículos que coincidan con la búsqueda.
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}

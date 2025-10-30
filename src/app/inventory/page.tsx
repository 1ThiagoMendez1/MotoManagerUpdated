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
  searchParams: {
    query?: string;
    category?: string;
    page?: string;
  };
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const category = resolvedSearchParams.category || '';
  const currentPage = Number(resolvedSearchParams.page) || 1;

  const [paginated, full] = await Promise.all([
    getInventory({ query, category, page: currentPage, limit: ITEMS_PER_PAGE }),
    getInventory({ limit: 1000 }), // Fetch all for export
  ]);

  const inventory = paginated.items;
  const totalPages = paginated.totalPages;
  const allInventory = full.items;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventario</h1>
          <p className="text-muted-foreground text-white/80">Gestiona tus repuestos y suministros.</p>
        </div>
        <div className="flex gap-2 flex-grow sm:flex-grow-0">
            <SearchInventory placeholder="Buscar por nombre o SKU..." />
            <CategoryFilter currentCategory={category} />
        </div>
        <div className="flex gap-2">
            <ExportInventoryButton inventory={allInventory} />
            <ExportLowStockButton inventory={allInventory} />
            <AddInventoryItem />
        </div>
      </div>
      <Card className="bg-white/10 border-white/20 text-white">
        <CardHeader>
          <CardTitle>Repuestos y Suministros</CardTitle>
          <CardDescription className="text-white/80">
            Una lista de todos los artículos en tu inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10">
                <TableHead className="text-white/90">Nombre del Artículo</TableHead>
                <TableHead className="hidden md:table-cell text-white/90">Categoría</TableHead>
                <TableHead className="hidden lg:table-cell text-white/90">Ubicación</TableHead>
                <TableHead className="text-right text-white/90">Cantidad</TableHead>
                <TableHead className="hidden md:table-cell text-right text-white/90">Precio</TableHead>
                <TableHead className="text-center text-white/90">Estado</TableHead>
                <TableHead className="text-right text-white/90 hidden md:table-cell">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const isLowStock = item.quantity <= item.minimumQuantity;
                return (
                  <TableRow key={item.id} className={cn('border-white/20 hover:bg-white/10', isLowStock && 'bg-destructive/20')}>
                    <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-sm text-white/70 font-mono">{item.sku}</div>
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
                          <DeleteInventoryItem item={item} />
                        </div>
                      </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
           {inventory.length === 0 && (
            <div className="text-center py-10 text-white/70">
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

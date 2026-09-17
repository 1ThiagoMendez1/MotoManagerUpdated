"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Store, History, AlertTriangle } from "lucide-react";
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AddInventoryItem } from '@/components/forms/AddInventoryItem';
import { EditInventoryItem } from '@/components/forms/EditInventoryItem';
import { TransferStockDialog } from '@/components/forms/TransferStockDialog';
import { BulkTransferDialog } from '@/components/forms/BulkTransferDialog';
import { ItemKardexModal } from '@/components/inventory/ItemKardexModal';
import { ExportInventoryButton } from '@/components/buttons/ExportInventoryButton';
import { ExportLowStockButton } from '@/components/buttons/ExportLowStockButton';
import { SearchInventory } from '@/components/forms/SearchInventory';
import { CategoryFilter } from '@/components/CategoryFilter';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/common/PageHeader';
import { ModuleToolbar } from '@/components/common/ModuleToolbar';
import { SelectionActionBar } from '@/components/common/SelectionActionBar';
import type { InventoryItem } from '@/lib/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function InventoryClient({
  inventory,
  totalPages,
  globalMovements = []
}: {
  inventory: InventoryItem[];
  totalPages: number;
  globalMovements?: any[];
}) {
  const [selectedVitrina, setSelectedVitrina] = useState<string[]>([]);
  const [selectedBodega, setSelectedBodega] = useState<string[]>([]);

  function toggleSelection(id: string, locationType: 'warehouse' | 'storefront') {
    if (locationType === 'warehouse') {
      setSelectedBodega(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedVitrina(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  }

  function toggleAll(items: InventoryItem[], locationType: 'warehouse' | 'storefront') {
    const trackableItems = items.filter(i => i.trackInventory !== false);
    if (locationType === 'warehouse') {
      if (selectedBodega.length === trackableItems.length && trackableItems.length > 0) {
        setSelectedBodega([]);
      } else {
        setSelectedBodega(trackableItems.map(i => i.id));
      }
    } else {
      if (selectedVitrina.length === trackableItems.length && trackableItems.length > 0) {
        setSelectedVitrina([]);
      } else {
        setSelectedVitrina(trackableItems.map(i => i.id));
      }
    }
  }

  function renderTable(items: InventoryItem[], locationType: 'warehouse' | 'storefront') {
    const filteredInventory = items.filter(item => {
      if (item.trackInventory === false) return true;
      const stock = item.stockDetails?.find(s => s.type === locationType);
      return stock && stock.quantity >= 0;
    });

    const selected = locationType === 'warehouse' ? selectedBodega : selectedVitrina;
    const trackableCount = filteredInventory.filter(i => i.trackInventory !== false).length;
    const allSelected = trackableCount > 0 && selected.length === trackableCount;

    return (
      <div className="space-y-4">
        {/* Floating selection action bar */}
        <SelectionActionBar
          selectedCount={selected.length}
          onClearSelection={() => {
            if (locationType === 'warehouse') setSelectedBodega([]);
            else setSelectedVitrina([]);
          }}
          actions={
            <BulkTransferDialog 
              selectedItemIds={selected} 
              inventory={inventory} 
              currentLocation={locationType} 
              onSuccess={() => {
                if (locationType === 'warehouse') setSelectedBodega([]);
                else setSelectedVitrina([]);
              }}
            />
          }
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                <TableHead className="w-[45px] py-3 pl-3">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={() => toggleAll(filteredInventory, locationType)}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Artículo</TableHead>
                <TableHead className="hidden md:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Categoría</TableHead>
                <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3">
                  Stock en {locationType === 'warehouse' ? 'Bodega' : 'Vitrina'}
                </TableHead>
                <TableHead className="text-right hidden sm:table-cell text-foreground font-semibold text-xs uppercase tracking-wider py-3">Precio</TableHead>
                <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    No se encontraron artículos con este criterio.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const stockItem = item.stockDetails?.find(s => s.type === locationType);
                  const qty = stockItem?.quantity || 0;
                  const isLowStock = item.trackInventory !== false && qty <= item.minimumQuantity;
                  const isSelected = selected.includes(item.id);
                  const isTrackable = item.trackInventory !== false;
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        'border-border/50 hover:bg-muted/30 transition-colors',
                        isLowStock && 'bg-destructive/10 hover:bg-destructive/15',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <TableCell className="py-2.5 pl-3">
                        {isTrackable && (
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(item.id, locationType)}
                            aria-label={`Seleccionar ${item.name}`}
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-foreground text-sm leading-tight">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku || 'S/C'}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2.5">
                        <Badge variant="outline" className="text-[11px] font-medium bg-muted/40 border-border/60">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex items-center justify-end gap-1.5 font-mono">
                          {isLowStock && (
                            <span title="Bajo stock">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            </span>
                          )}
                          <span className={cn('font-bold text-sm', isLowStock ? 'text-red-500' : 'text-foreground')}>
                            {isTrackable ? qty : '∞'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell py-2.5 font-medium text-sm">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <TransferStockDialog 
                            item={item} 
                            currentLocation={locationType} 
                          />
                          <ItemKardexModal item={item} />
                          <EditInventoryItem item={item} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Estandarizado */}
      <PageHeader
        title="Inventario"
        description="Control de repuestos, accesorios, stock en mostrador y almacenamiento en bodega."
        icon={Package}
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
            {inventory.length} artículos
          </span>
        }
      />

      {/* Toolbar con Búsqueda, Filtro de Categoría y Acciones */}
      <ModuleToolbar
        searchComponent={<SearchInventory placeholder="Buscar por nombre o código..." />}
        filtersComponent={<CategoryFilter />}
        primaryAction={<AddInventoryItem />}
        secondaryActions={[
          { label: 'Exportar Inventario', component: <ExportInventoryButton inventory={inventory} /> },
          { label: 'Exportar Bajo Stock', component: <ExportLowStockButton inventory={inventory} /> },
        ]}
      />

      {/* Pestañas de Almacén */}
      <Tabs defaultValue="vitrina" className="w-full">
        <TabsList className="bg-muted/50 border border-border/60 p-1 rounded-xl h-10 mb-3">
          <TabsTrigger value="vitrina" className="rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-3.5">
            <Store className="w-3.5 h-3.5 text-primary" />
            <span>Vitrina (Mostrador)</span>
          </TabsTrigger>
          <TabsTrigger value="bodega" className="rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-3.5">
            <Package className="w-3.5 h-3.5 text-orange-500" />
            <span>Bodega Principal</span>
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-3.5">
            <History className="w-3.5 h-3.5 text-purple-500" />
            <span>Kardex (Auditoría)</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Vitrina */}
        <TabsContent value="vitrina" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {renderTable(inventory, 'storefront')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Bodega */}
        <TabsContent value="bodega" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {renderTable(inventory, 'warehouse')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Kardex Global */}
        <TabsContent value="movimientos" className="m-0 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {globalMovements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <History className="h-10 w-10 mb-3 opacity-40" />
                  <p className="font-semibold text-foreground text-sm">Aún no hay movimientos registrados</p>
                  <p className="text-xs text-muted-foreground mt-1">Los ingresos, ventas y traslados aparecerán auditados aquí.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Fecha</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Tipo</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Artículo</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">SKU</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Origen ➔ Destino</TableHead>
                        <TableHead className="text-right text-foreground font-semibold text-xs uppercase tracking-wider py-3">Cantidad</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3">Responsable</TableHead>
                        <TableHead className="text-foreground font-semibold text-xs uppercase tracking-wider py-3 pr-4">Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalMovements.map((mov) => {
                        let typeText = mov.type;
                        let typeClass = 'border-border text-muted-foreground';
                        
                        switch(mov.type) {
                          case 'purchase': typeText = 'Ingreso (Compra)'; typeClass = 'border-blue-500/30 text-blue-500 bg-blue-500/10'; break;
                          case 'sale': typeText = 'Venta / Salida'; typeClass = 'border-red-500/30 text-red-500 bg-red-500/10'; break;
                          case 'direct_sale': typeText = 'Venta directa'; typeClass = 'border-red-500/30 text-red-500 bg-red-500/10'; break;
                          case 'service_sale': typeText = 'Venta por servicio'; typeClass = 'border-red-500/30 text-red-500 bg-red-500/10'; break;
                          case 'transfer': typeText = 'Traslado'; typeClass = 'border-purple-500/30 text-purple-500 bg-purple-500/10'; break;
                          case 'adjustment': typeText = 'Ajuste'; typeClass = 'border-orange-500/30 text-orange-500 bg-orange-500/10'; break;
                        }

                        return (
                          <TableRow key={mov.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground py-2.5">
                              {new Date(mov.date).toLocaleDateString('es-CO')} {new Date(mov.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge variant="outline" className={cn('text-[10px] font-semibold', typeClass)}>{typeText}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-sm py-2.5 text-foreground">{mov.itemName}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs py-2.5">{mov.itemSku}</TableCell>
                            <TableCell className="text-xs py-2.5 text-muted-foreground">
                              {mov.fromLocation} ➔ <span className="text-foreground font-medium">{mov.toLocation}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold font-mono text-sm py-2.5">{mov.quantity}</TableCell>
                            <TableCell className="text-xs py-2.5">{mov.responsible || mov.user}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate py-2.5 pr-4" title={mov.notes}>
                              {mov.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Paginación */}
      <div className="mt-4 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}

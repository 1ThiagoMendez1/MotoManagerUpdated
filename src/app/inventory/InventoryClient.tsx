"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Store, History, Search } from "lucide-react";
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
import { TransferStockDialog } from '@/components/forms/TransferStockDialog';
import { ItemKardexModal } from '@/components/inventory/ItemKardexModal';
import { ExportInventoryButton } from '@/components/buttons/ExportInventoryButton';
import { ExportLowStockButton } from '@/components/buttons/ExportLowStockButton';
import { SearchInventory } from '@/components/forms/SearchInventory';
import { CategoryFilter } from '@/components/CategoryFilter';
import { Pagination } from '@/components/Pagination';
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
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestión Logística</h2>
          <p className="text-muted-foreground mt-1">
            Control de ubicaciones, traslados y auditoría (Kardex).
          </p>
        </div>
        <div className="flex gap-2">
          <ExportLowStockButton inventory={inventory} />
          <ExportInventoryButton inventory={inventory} />
          <AddInventoryItem />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <SearchInventory placeholder="Buscar repuestos..." />
        <CategoryFilter />
      </div>

      <Tabs defaultValue="vitrina" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border/50 p-1">
          <TabsTrigger value="vitrina" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Vitrina (Comercial)
          </TabsTrigger>
          <TabsTrigger value="bodega" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Bodega Principal
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Kardex (Auditoría Global)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitrina" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Catálogo de Vitrina</CardTitle>
              <CardDescription>Mercancía disponible en mostrador para ventas y órdenes de trabajo.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(inventory, 'storefront')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bodega" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Almacenamiento Interno (Bodega)</CardTitle>
              <CardDescription>Stock guardado internamente. Utiliza "Trasladar" para pasarlo a Vitrina.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(inventory, 'warehouse')}
            </CardContent>
          </Card>
        </TabsContent>
      
        <TabsContent value="movimientos" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Auditoría de Movimientos Globales</CardTitle>
              <CardDescription>Libro mayor de todos los ingresos, traslados y salidas del taller.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                 <History className="h-10 w-10 mb-4 opacity-50" />
                 <p>El libro mayor de movimientos está activo.</p>
                 <p className="text-sm mt-2">Para ver el historial detallado, ve a Bodega o Vitrina y haz clic en el botón <b>Kardex</b> de cada repuesto.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <div className="mt-6 flex w-full justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}

function renderTable(inventory: InventoryItem[], locationType: 'warehouse' | 'storefront') {
    const filteredInventory = inventory.filter(item => {
        if (item.trackInventory === false) return true; // Show non-tracked everywhere
        const stock = item.stockDetails?.find(s => s.type === locationType);
        return stock && stock.quantity >= 0; // Show if it has an entry, even if 0
    });

    return (
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>Artículo</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="text-right">Stock en {locationType === 'warehouse' ? 'Bodega' : 'Vitrina'}</TableHead>
              <TableHead className="text-right hidden md:table-cell">Precio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => {
              const stockItem = item.stockDetails?.find(s => s.type === locationType);
              const qty = stockItem?.quantity || 0;
              const isLowStock = item.trackInventory !== false && qty <= item.minimumQuantity;
              
              return (
                <TableRow key={item.id} className={cn('border-border/50 hover:bg-primary/5 transition-colors', isLowStock && 'bg-destructive/20 hover:bg-destructive/30')}>
                  <TableCell className="font-medium">
                      <div>{item.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{item.sku}</div>
                      {item.location && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> {item.location}</div>}
                      {item.supplier && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> Proveedor: {item.supplier}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                  <TableCell className="text-right font-bold text-lg">
                      {item.trackInventory === false ? '∞' : qty}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {locationType === 'warehouse' && <TransferStockDialog item={item} />}
                      <ItemKardexModal item={item} />
                      <EditInventoryItem item={item} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
    );
}

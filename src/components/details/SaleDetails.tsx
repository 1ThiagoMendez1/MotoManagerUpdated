"use client";

import { useState } from 'react';
import { Eye, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatExactDateTime } from '@/lib/dateUtils';
import type { Sale, InventoryItem } from '@/lib/types';

interface SaleDetailsProps {
  sale: Sale;
  inventoryItems: InventoryItem[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SaleDetails({ sale, inventoryItems }: SaleDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintReceipt = async () => {
    setIsPrinting(true);
    try {
      const { printReceipt } = await import('@/lib/pdfGenerator');
      
      const formattedItems = sale.items?.map(item => {
        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
        return {
          name: item.name || inventoryItem?.name || 'Producto',
          sku: item.sku || inventoryItem?.sku || '-',
          category: inventoryItem?.category,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        };
      }) || [];

      const receiptData = {
        saleNumber: sale.saleNumber.replace('SALE-', ''),
        date: sale.date,
        customerName: sale.customerName || sale.customer?.name || 'Cliente de Mostrador',
        paymentMethod: sale.paymentMethod,
        workshopName: sale.workshopName || 'MotoManager',
        items: formattedItems,
        laborCost: sale.laborCost || 0,
        subtotal: sale.subtotal || sale.total,
        discountPercentage: sale.discountPercentage || 0,
        discountAmount: sale.discountTotal || 0,
        depositAmount: sale.depositAmount || 0,
        remainingBalance: sale.depositAmount && sale.depositAmount > 0 ? Math.max(0, sale.total - sale.depositAmount) : undefined,
        total: sale.total,
        workOrderId: sale.workOrder?.workOrderNumber?.replace('WO-', '') || sale.workOrderId || undefined,
        motorcycleInfo: sale.workOrder?.motorcycle ? {
          make: sale.workOrder.motorcycle.make,
          model: sale.workOrder.motorcycle.model,
          year: sale.workOrder.motorcycle.year,
          plate: sale.workOrder.motorcycle.plate
        } : undefined,
        technicianName: sale.workOrder?.technician?.name || undefined
      };

      printReceipt(receiptData);
    } catch (error) {
      console.error('Error al imprimir comprobante:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const getSaleDetails = (sale: Sale) => {
    if (sale.workOrderId && sale.workOrder) {
      // Para servicios, el resumen debe reflejar la solución aplicada
      // y, si no existe, al menos el problema reportado
      const wo: any = sale.workOrder;
      return (
        wo.solutionDescription ||
        wo.issueDescription ||
        'Servicio de mantenimiento / reparación realizado a la motocicleta'
      );
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Ver Detalle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalles de Venta #{sale.saleNumber}</DialogTitle>
          <DialogDescription className="text-gray-600">
            Información completa de la transacción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">INFORMACIÓN GENERAL</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Número:</span> {sale.saleNumber}</div>
                <div><span className="font-medium">Tipo:</span>
                  {sale.workOrderId ? (
                    <Badge variant="secondary" className="ml-2">Servicio</Badge>
                  ) : (
                    <Badge className="ml-2">Mostrador</Badge>
                  )}
                </div>
                <div><span className="font-medium">Fecha:</span> {sale.date ? formatExactDateTime(sale.date) : 'Fecha no disponible'}</div>
                <div><span className="font-medium">Método de Pago:</span> {sale.paymentMethod || 'No especificado'}</div>
                {(() => {
                  const deposit = sale.depositAmount || sale.workOrder?.depositAmount || 0;
                  if (!deposit) return null;
                  const remaining = Math.max(0, sale.total - deposit);
                  return (
                    <>
                      <div><span className="font-medium">Abono del cliente:</span> <span className="font-bold text-blue-600 dark:text-blue-400">- {formatCurrency(deposit)}</span></div>
                      <div><span className="font-medium">Pagó al finalizar:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(remaining)}</span></div>
                    </>
                  );
                })()}
                <div><span className="font-medium">Total:</span> <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(sale.total)}</span></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">CLIENTE</h3>
              <div className="space-y-1 text-sm">
                {sale.workOrderId && sale.workOrder ? (
                  <>
                    <div><span className="font-medium">Nombre:</span> {sale.workOrder.motorcycle.customer.name}</div>
                    <div><span className="font-medium">Email:</span> {sale.workOrder.motorcycle.customer.email}</div>
                    <div><span className="font-medium">Teléfono:</span> {sale.workOrder.motorcycle.customer.phone || 'N/A'}</div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium">Nombre:</span> {sale.customer?.name || sale.customerName || 'Cliente de Mostrador'}</div>
                    {sale.customer?.email && <div><span className="font-medium">Email:</span> {sale.customer.email}</div>}
                    {sale.customer?.phone && <div><span className="font-medium">Teléfono:</span> {sale.customer.phone}</div>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Información del Vehículo (si aplica) */}
          {sale.workOrderId && sale.workOrder && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400 mb-2">VEHÍCULO</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div><span className="font-medium">Marca:</span> {sale.workOrder.motorcycle.make}</div>
                  <div><span className="font-medium">Modelo:</span> {sale.workOrder.motorcycle.model}</div>
                  <div><span className="font-medium">Año:</span> {sale.workOrder.motorcycle.year}</div>
                </div>
                <div>
                  <div><span className="font-medium">Placa:</span> {sale.workOrder.motorcycle.plate}</div>
                  <div><span className="font-medium">Fecha de Ingreso:</span> {sale.workOrder.motorcycle.intakeDate ? formatExactDateTime(sale.workOrder.motorcycle.intakeDate) : 'Fecha no disponible'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Detalles del Servicio (si aplica) */}
          {sale.workOrderId && sale.workOrder && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h3 className="font-semibold text-sm text-green-700 dark:text-green-400 mb-2">SERVICIO REALIZADO</h3>
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Técnico:</span>{' '}
                  {sale.workOrder.technician?.name || 'Sin asignar'}
                </div>
                {sale.workOrder.technician?.specialty && (
                  <div>
                    <span className="font-medium">Especialidad:</span>{' '}
                    {sale.workOrder.technician.specialty}
                  </div>
                )}
                <div><span className="font-medium">Problema Reportado:</span></div>
                <div className="bg-background p-3 rounded border text-muted-foreground italic">
                  "{sale.workOrder.issueDescription || 'No registrado por el cliente.'}"
                </div>
                <div><span className="font-medium">Solución Realizada:</span></div>
                <div className="bg-background p-3 rounded border text-muted-foreground italic">
                  "{(sale.workOrder as any).solutionDescription || 'No se registró una solución específica.'}"
                </div>
                <div>
                  <span className="font-medium">Estado Final:</span>
                  <Badge variant="secondary" className="ml-2">
                    {sale.workOrder.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Artículos Vendidos */}
          {sale.items && sale.items.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-400 mb-3">ARTÍCULOS VENDIDOS</h3>
              <div className="space-y-2">
                {sale.items.map((item, index) => {
                  const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
                  return (
                    <div key={index} className="flex justify-between items-center bg-background p-3 rounded border">
                      <div className="flex-1">
                        <div className="font-medium">{inventoryItem?.name || 'Artículo no encontrado'}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {inventoryItem?.sku || item.inventoryItemId} | Cantidad: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(item.price)} c/u</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200 dark:border-purple-900">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>TOTAL:</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">RESUMEN</h3>
            <div className="text-sm text-muted-foreground">
              {getSaleDetails(sale)}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
            <Button 
              size="sm" 
              onClick={handlePrintReceipt} 
              disabled={isPrinting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPrinting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Imprimiendo...
                </>
              ) : (
                <>
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Imprimir Comprobante
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
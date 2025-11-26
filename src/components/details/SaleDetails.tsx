"use client";

import { useState } from 'react';
import { Eye, X } from 'lucide-react';
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
import { format } from 'date-fns';
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
      <DialogContent className="sm:max-w-2xl bg-white text-black max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalles de Venta #{sale.saleNumber}</DialogTitle>
          <DialogDescription className="text-gray-600">
            Información completa de la transacción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">INFORMACIÓN GENERAL</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Número:</span> {sale.saleNumber}</div>
                <div><span className="font-medium">Tipo:</span>
                  {sale.workOrderId ? (
                    <Badge variant="secondary" className="ml-2">Servicio</Badge>
                  ) : (
                    <Badge className="ml-2">Mostrador</Badge>
                  )}
                </div>
                <div><span className="font-medium">Fecha:</span> {sale.date ? format(new Date(sale.date), 'dd/MM/yyyy HH:mm') : 'Fecha no disponible'}</div>
                <div><span className="font-medium">Método de Pago:</span> {sale.paymentMethod || 'No especificado'}</div>
                <div><span className="font-medium">Total:</span> <span className="font-bold text-green-600">{formatCurrency(sale.total)}</span></div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">CLIENTE</h3>
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
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-sm text-blue-700 mb-2">VEHÍCULO</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div><span className="font-medium">Marca:</span> {sale.workOrder.motorcycle.make}</div>
                  <div><span className="font-medium">Modelo:</span> {sale.workOrder.motorcycle.model}</div>
                  <div><span className="font-medium">Año:</span> {sale.workOrder.motorcycle.year}</div>
                </div>
                <div>
                  <div><span className="font-medium">Placa:</span> {sale.workOrder.motorcycle.plate}</div>
                  <div><span className="font-medium">Fecha de Ingreso:</span> {sale.workOrder.motorcycle.intakeDate ? format(new Date(sale.workOrder.motorcycle.intakeDate), 'dd/MM/yyyy') : 'Fecha no disponible'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Detalles del Servicio (si aplica) */}
          {sale.workOrderId && sale.workOrder && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-sm text-green-700 mb-2">SERVICIO REALIZADO</h3>
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
                <div className="bg-white p-3 rounded border text-gray-700 italic">
                  "{sale.workOrder.issueDescription || 'No registrado por el cliente.'}"
                </div>
                <div><span className="font-medium">Solución Realizada:</span></div>
                <div className="bg-white p-3 rounded border text-gray-700 italic">
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
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-sm text-purple-700 mb-3">ARTÍCULOS VENDIDOS</h3>
              <div className="space-y-2">
                {sale.items.map((item, index) => {
                  const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
                  return (
                    <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                      <div className="flex-1">
                        <div className="font-medium">{inventoryItem?.name || 'Artículo no encontrado'}</div>
                        <div className="text-sm text-gray-600">
                          SKU: {inventoryItem?.sku || item.inventoryItemId} | Cantidad: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.price * item.quantity)}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(item.price)} c/u</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>TOTAL:</span>
                  <span className="text-green-600">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">RESUMEN</h3>
            <div className="text-sm text-gray-600">
              {getSaleDetails(sale)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { getWorkOrderById } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkOrderBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workOrder = await getWorkOrderById(id);

  if (!workOrder) return <div className="text-foreground">Orden no encontrada</div>;

  // Calculate total cost of items and services
  const itemsCost = (workOrder.sales || []).reduce((total: number, sale: any) => {
    return total + (sale.saleItems || []).reduce((saleTotal: number, item: any) => {
      return saleTotal + (item.price * item.quantity);
    }, 0);
  }, 0);

  const servicesCost = (workOrder.work_order_services || []).reduce((total: number, service: any) => {
    return total + service.total;
  }, 0);

  const totalCost = itemsCost + servicesCost;

  return (
    <div className="w-full max-w-5xl mx-auto text-foreground py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Facturación - Orden #{workOrder.workOrderNumber}</h1>
            <p className="text-muted-foreground mt-2">Resumen de costos y productos utilizados</p>
          </div>
          <Link href={`/work-orders/${workOrder.id}`}>
            <Button variant="outline" className="bg-transparent border-border/80 text-foreground hover:bg-card/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Orden
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Información de la Orden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-sm">Creada:</span>
                <p className="font-medium">{format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Estado:</span>
                <p className="font-medium">{workOrder.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Motocicleta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-sm">Marca y Modelo:</span>
                <p className="font-medium">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Cliente y Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-sm">Cliente:</span>
                <p className="font-medium">{workOrder.motorcycle.customer.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Técnico:</span>
                <p className="font-medium">{workOrder.technician?.name ?? 'Sin asignar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-2xl">Resumen de Facturación</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Productos e Insumos Utilizados</h3>
            {(!workOrder.sales || workOrder.sales.length === 0 || workOrder.sales.every((sale: any) => !sale.saleItems || sale.saleItems.length === 0)) ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                No hay insumos o repuestos registrados para esta orden.
              </div>
            ) : (
              <div className="space-y-3">
                {(workOrder.sales || []).flatMap((sale: any) =>
                  (sale.saleItems || []).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-card/30 p-3 rounded-lg border border-border/30">
                      <div className="flex-1">
                        <p className="font-medium">{item.inventoryItem.name}</p>
                        <p className="text-sm text-muted-foreground">Cantidad: {item.quantity} | Precio Unitario: ${item.price.toFixed(2)} | Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Servicios Realizados (Mano de Obra)</h3>
            {(!workOrder.work_order_services || workOrder.work_order_services.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                No hay servicios registrados para esta orden.
              </div>
            ) : (
              <div className="space-y-3">
                {workOrder.work_order_services.map((service: any) => (
                  <div key={service.id} className="flex justify-between items-center bg-card/30 p-3 rounded-lg border border-border/30">
                    <div className="flex-1">
                      <p className="font-medium">{service.description}</p>
                      <p className="text-sm text-muted-foreground">Categoría: {service.service_catalog?.category || 'N/A'} | Precio Unitario: ${service.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${service.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">Total:</span>
              <span className="text-2xl font-bold text-blue-400">${totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Removed Generar Factura button as per user request */}
        </CardContent>
      </Card>
    </div>
  );
}
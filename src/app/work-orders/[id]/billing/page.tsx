import { getWorkOrderById } from '@/lib/work-order-actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkOrderBillingPage({ params }: { params: { id: string } }) {
  const workOrder = await getWorkOrderById(params.id);

  if (!workOrder) return <div className="text-white">Orden no encontrada</div>;

  // Calculate total cost of items
  const totalCost = workOrder.sales.reduce((total, sale) => {
    return total + sale.saleItems.reduce((saleTotal, item) => {
      return saleTotal + (item.price * item.quantity);
    }, 0);
  }, 0);

  return (
    <div className="w-full max-w-5xl mx-auto text-white py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Facturación - Orden #{workOrder.workOrderNumber}</h1>
            <p className="text-white/70 mt-2">Resumen de costos y productos utilizados</p>
          </div>
          <Link href={`/work-orders/${workOrder.id}`}>
            <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Orden
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Información de la Orden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white/70 text-sm">Creada:</span>
                <p className="font-medium">{format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <span className="text-white/70 text-sm">Estado:</span>
                <p className="font-medium">{workOrder.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Motocicleta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white/70 text-sm">Marca y Modelo:</span>
                <p className="font-medium">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Cliente y Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white/70 text-sm">Cliente:</span>
                <p className="font-medium">{workOrder.motorcycle.customer.name}</p>
              </div>
              <div>
                <span className="text-white/70 text-sm">Técnico:</span>
                <p className="font-medium">{workOrder.technician?.name ?? 'Sin asignar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="text-2xl">Resumen de Facturación</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Productos e Insumos Utilizados</h3>
            {workOrder.sales.length === 0 || workOrder.sales.every(sale => sale.saleItems.length === 0) ? (
              <div className="text-center py-8 text-white/60 border border-dashed border-white/20 rounded-lg">
                No hay insumos o repuestos registrados para esta orden.
              </div>
            ) : (
              <div className="space-y-3">
                {workOrder.sales.flatMap(sale =>
                  sale.saleItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <p className="font-medium">{item.inventoryItem.name}</p>
                        <p className="text-sm text-white/70">Cantidad: {item.quantity} | Precio Unitario: ${item.price.toFixed(2)} | Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
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
          
          <div className="mt-8 pt-4 border-t border-white/20">
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
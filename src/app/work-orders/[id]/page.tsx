import { getWorkOrderById } from '@/lib/work-order-actions';
import { getInventory } from '@/lib/data';
import { AddItemToWorkOrder } from '@/components/forms/AddItemToWorkOrder';
import { RemoveItemFromWorkOrder } from '@/components/forms/RemoveItemFromWorkOrder';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const workOrder = await getWorkOrderById(params.id);

  if (!workOrder) return <div className="text-white">Orden no encontrada</div>;

  const inventory = await getInventory({ page: 1, limit: 100 });
  const isCompleted = workOrder.status === 'Entregado';

  return (
    <div className="w-full max-w-5xl mx-auto text-white py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center text-white">Orden #{workOrder.workOrderNumber}</h1>
        <p className="text-center text-white mt-2">Gestiona todos los detalles de esta orden de trabajo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white">Información Básica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white text-sm">Creada:</span>
                <p className="font-medium text-white">{format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <span className="text-white text-sm">Estado:</span>
                <p className="font-medium text-white">{workOrder.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white">Motocicleta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white text-sm">Marca y Modelo:</span>
                <p className="font-medium text-white">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-white">Cliente y Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-white text-sm">Cliente:</span>
                <p className="font-medium text-white">{workOrder.motorcycle.customer.name}</p>
              </div>
              <div>
                <span className="text-white text-sm">Técnico:</span>
                <p className="font-medium text-white">{workOrder.technician?.name ?? 'Sin asignar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="text-2xl text-white">Insumos y Repuestos Usados</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
        {isCompleted ? (
          <div className="mb-6 bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium mb-2 text-white">Orden Finalizada</h3>
            <p className="text-sm text-white">
              Esta orden se encuentra en estado <span className="font-semibold">Entregado</span>.
              No es posible agregar nuevos items porque la orden ya fue finalizada y facturada.
            </p>
          </div>
        ) : (
          <div className="mb-6 bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium mb-4 text-white">Agregar Nuevo Item</h3>
            <AddItemToWorkOrder workOrderId={workOrder.id} inventory={inventory.items} />
          </div>
        )}

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3 text-white">Items Actuales</h3>
            {workOrder.sales.length === 0 || workOrder.sales.every(sale => sale.saleItems.length === 0) ? (
              <div className="text-center py-8 text-white border border-dashed border-white/20 rounded-lg">
                No hay insumos o repuestos registrados para esta orden.
              </div>
            ) : (
              <div className="space-y-3">
                {workOrder.sales.flatMap(sale =>
                  sale.saleItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <p className="font-medium">{item.inventoryItem.name}</p>
                        <p className="text-sm text-white">Cantidad: {item.quantity} | Precio: ${item.price.toFixed(2)}</p>
                      </div>
                      {!isCompleted && (
                        <RemoveItemFromWorkOrder workOrderId={workOrder.id} saleItemId={item.id} />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
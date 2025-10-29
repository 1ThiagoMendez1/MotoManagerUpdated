'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  _count?: {
    customers: number;
    motorcycles: number;
    technicians: number;
    inventoryItems: number;
    appointments: number;
    workOrders: number;
    sales: number;
  };
}

interface DeleteTenantProps {
  tenant: Tenant;
  onSuccess?: () => void;
}

export default function DeleteTenant({ tenant, onSuccess }: DeleteTenantProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const hasData = tenant._count && Object.values(tenant._count).some(count => count > 0);

  const handleDelete = async () => {
    if (hasData) {
      setError('No se puede eliminar el tenant porque tiene datos asociados');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el tenant');
      }

      setIsOpen(false);
      onSuccess?.();
      router.push('/admin/tenants');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el tenant
              <strong> {tenant.name}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {hasData && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Advertencia:</strong> Este tenant contiene datos y no puede ser eliminado.
                Los siguientes elementos están asociados:
                <ul className="mt-2 list-disc list-inside">
                  {tenant._count?.customers && tenant._count.customers > 0 && (
                    <li>{tenant._count.customers} cliente(s)</li>
                  )}
                  {tenant._count?.motorcycles && tenant._count.motorcycles > 0 && (
                    <li>{tenant._count.motorcycles} motocicleta(s)</li>
                  )}
                  {tenant._count?.technicians && tenant._count.technicians > 0 && (
                    <li>{tenant._count.technicians} técnico(s)</li>
                  )}
                  {tenant._count?.inventoryItems && tenant._count.inventoryItems > 0 && (
                    <li>{tenant._count.inventoryItems} artículo(s) de inventario</li>
                  )}
                  {tenant._count?.appointments && tenant._count.appointments > 0 && (
                    <li>{tenant._count.appointments} cita(s)</li>
                  )}
                  {tenant._count?.workOrders && tenant._count.workOrders > 0 && (
                    <li>{tenant._count.workOrders} orden(es) de trabajo</li>
                  )}
                  {tenant._count?.sales && tenant._count.sales > 0 && (
                    <li>{tenant._count.sales} venta(s)</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading || hasData}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Tenant'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
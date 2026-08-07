'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { removeServiceFromWorkOrder } from '@/lib/actions/work-orders-services';
import { useToast } from '@/hooks/use-toast';

interface RemoveServiceFromWorkOrderProps {
  workOrderId: string;
  workOrderServiceId: string;
}

export function RemoveServiceFromWorkOrder({ workOrderId, workOrderServiceId }: RemoveServiceFromWorkOrderProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleRemove = async () => {
    if (!confirm('¿Estás seguro de quitar este servicio de la orden?')) return;
    
    setIsDeleting(true);
    try {
      const result = await removeServiceFromWorkOrder(workOrderId, workOrderServiceId);
      if (result.success) {
        toast({
          title: 'Servicio removido',
          description: 'El servicio fue quitado de la orden de trabajo.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo remover el servicio.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRemove}
      disabled={isDeleting}
      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
      title="Quitar servicio"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </Button>
  );
}

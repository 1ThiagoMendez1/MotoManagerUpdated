"use client";

import { useState, useEffect } from 'react';
import { History, Loader2, ArrowRightLeft, ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getKardexMovements } from '@/lib/actions/inventory';
import type { InventoryItem } from '@/lib/types';

export function ItemKardexModal({ item }: { item: InventoryItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
  }, [isOpen]);

  async function loadMovements() {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
        const response = await getKardexMovements(item.id);
        if (response.error) {
            setErrorMsg(response.error);
        } else if (response.data) {
            setMovements(response.data);
        }
    } catch (e: any) {
        setErrorMsg(e.message || 'Error de conexión');
    }
    
    setIsLoading(false);
  }

  const getMovementIcon = (type: string) => {
      switch (type) {
          case 'purchase': return <ShoppingCart className="w-4 h-4 text-emerald-500" />;
          case 'transfer': return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
          case 'sale': 
          case 'direct_sale': 
          case 'service_sale': return <Tag className="w-4 h-4 text-rose-500" />;
          default: return <History className="w-4 h-4 text-muted-foreground" />;
      }
  };

  const getMovementLabel = (type: string) => {
      switch (type) {
          case 'purchase': return 'Compra (Ingreso)';
          case 'transfer': return 'Traslado Interno';
          case 'sale': return 'Salida (Venta/Orden)';
          case 'direct_sale': return 'Venta directa';
          case 'service_sale': return 'Venta por servicio';
          default: return 'Ajuste Manual';
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Ver Kardex">
          <History className="w-4 h-4 mr-2" />
          Kardex
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Kardex de Movimientos</DialogTitle>
          <DialogDescription>
            Historial detallado para: <b>{item.name}</b> (SKU: {item.sku})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : movements.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No hay movimientos registrados para este repuesto. {errorMsg && <p className='text-red-500 mt-2'>Error DB: {errorMsg}</p>}</div>
        ) : (
            <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Fecha y Hora</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Origen</th>
                            <th className="px-4 py-3">Destino</th>
                            <th className="px-4 py-3 text-right">Cant.</th>
                            <th className="px-4 py-3 rounded-tr-lg">Responsable</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {movements.map((m, i) => (
                            <tr key={i} className="hover:bg-muted/10">
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                    {new Date(m.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                    {getMovementIcon(m.movement_type)}
                                    {getMovementLabel(m.movement_type)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{m.from_loc?.name || '-'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{m.to_loc?.name || '-'}</td>
                                <td className="px-4 py-3 text-right font-bold">{m.quantity}</td>
                                <td className="px-4 py-3 text-muted-foreground">{m.user ? `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() : 'Sistema'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { fulfillPartRequest, rejectPartRequest } from '@/lib/actions/work-orders';
import { format } from 'date-fns';
import { Package, Check, X, Clock, User } from 'lucide-react';

interface PartRequest {
    id: string;
    organization_id: string;
    work_order_id: string;
    inventory_item_id: string;
    requested_by: string;
    quantity: number;
    status: 'pending' | 'fulfilled' | 'rejected';
    fulfilled_by?: string;
    fulfilled_at?: string;
    created_at: string;
    inventory_items?: {
        name: string;
        code: string;
    };
    requester?: {
        first_name: string;
        last_name: string;
    };
    fulfiller?: {
        first_name: string;
        last_name: string;
    };
}

interface PartRequestsSectionProps {
    workOrderId: string;
    requests: PartRequest[];
    userRole: string;
}

export function PartRequestsSection({ workOrderId, requests, userRole }: PartRequestsSectionProps) {
    const { toast } = useToast();
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const processingRef = useRef<Set<string>>(new Set());

    const isManager = userRole === 'owner' || userRole === 'admin';

    const handleAction = async (requestId: string, action: 'fulfill' | 'reject') => {
        if (processingRef.current.has(requestId)) return;
        processingRef.current.add(requestId);

        setLoadingIds((prev) => {
            const next = new Set(prev);
            next.add(requestId);
            return next;
        });

        try {
            let result;
            if (action === 'fulfill') {
                result = await fulfillPartRequest(requestId, workOrderId);
            } else {
                result = await rejectPartRequest(requestId, workOrderId);
            }

            if (result && !result.success) {
                toast({
                    title: "Error",
                    description: result.error || "No se pudo procesar la solicitud.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: action === 'fulfill' ? "Repuesto alistado" : "Solicitud rechazada",
                    description: action === 'fulfill' ? "Se ha descontado del inventario y agregado a la factura." : "La solicitud fue denegada.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error de red",
                description: "Ocurrió un error inesperado al procesar la solicitud.",
                variant: "destructive"
            });
        } finally {
            processingRef.current.delete(requestId);
            setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    if (!requests || requests.length === 0) {
        return null; // Don't render anything if there are no requests
    }

    return (
        <div className="mt-8">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                Repuestos Solicitados
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map((req) => (
                    <div key={req.id} className={`flex flex-col gap-3 p-4 rounded-xl border border-border/50 transition-colors shadow-sm ${
                        req.status === 'pending' ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/20' : 
                        req.status === 'fulfilled' ? 'bg-green-500/5 border-green-500/20 opacity-80' : 
                        'bg-red-500/5 border-red-500/20 opacity-80'
                    }`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-foreground text-lg mb-1">{req.inventory_items?.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Package className="w-4 h-4" />
                                    <span>Cant: <strong>{req.quantity}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>Solicitado el {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</span>
                                </div>
                                {req.requester && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <User className="w-3 h-3" />
                                        <span>Por: {req.requester.first_name} {req.requester.last_name}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="shrink-0">
                                {req.status === 'pending' && (
                                    <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-semibold rounded-lg border border-yellow-500/20 uppercase tracking-wider">
                                        Pendiente
                                    </span>
                                )}
                                {req.status === 'fulfilled' && (
                                    <span className="px-2.5 py-1 bg-green-500/10 text-green-600 text-xs font-semibold rounded-lg border border-green-500/20 uppercase tracking-wider flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Alistado
                                    </span>
                                )}
                                {req.status === 'rejected' && (
                                    <span className="px-2.5 py-1 bg-red-500/10 text-red-600 text-xs font-semibold rounded-lg border border-red-500/20 uppercase tracking-wider flex items-center gap-1">
                                        <X className="w-3 h-3" /> Rechazado
                                    </span>
                                )}
                            </div>
                        </div>

                        {req.status === 'pending' && isManager && (
                            <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/50">
                                <Button 
                                    size="sm" 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction(req.id, 'fulfill')}
                                    disabled={loadingIds.has(req.id)}
                                >
                                    {loadingIds.has(req.id) ? "Procesando..." : "Alistar Repuesto"}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full hover:bg-red-500 hover:text-white"
                                    onClick={() => handleAction(req.id, 'reject')}
                                    disabled={loadingIds.has(req.id)}
                                >
                                    Rechazar
                                </Button>
                            </div>
                        )}

                        {req.status !== 'pending' && req.fulfiller && (
                            <div className="mt-2 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{req.status === 'fulfilled' ? 'Alistado' : 'Rechazado'} por {req.fulfiller.first_name} {req.fulfiller.last_name}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

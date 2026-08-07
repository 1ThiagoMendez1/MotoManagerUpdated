"use client";

import { useState } from 'react';
import { Eye, History, FileText, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCustomerFullHistory } from '@/lib/actions/customers';
import { formatExactDateTime } from '@/lib/dateUtils';
import type { Customer } from '@/lib/types';

export function CustomerDetails({ customer }: { customer: Customer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any>(null);

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !history) {
      setLoading(true);
      try {
        const data = await getCustomerFullHistory(customer.id);
        setHistory(data);
      } catch (error) {
        console.error("Error loading customer history", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 hover:text-emerald-500 hover:bg-emerald-500/10">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
            <History className="w-5 h-5 text-emerald-500" />
            Trazabilidad del Cliente: {customer.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Cargando historial completo...</p>
          </div>
        ) : history ? (
          <div className="flex flex-col flex-grow overflow-hidden">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-foreground/5 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground font-medium mb-1">Motos</span>
                <span className="text-2xl font-bold text-foreground">{history.summary.totalMotorcycles}</span>
              </div>
              <div className="bg-foreground/5 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground font-medium mb-1">Servicios</span>
                <span className="text-2xl font-bold text-foreground">{history.summary.totalWorkOrders}</span>
              </div>
              <div className="bg-foreground/5 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground font-medium mb-1">Compras</span>
                <span className="text-2xl font-bold text-foreground">{history.summary.totalSales}</span>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Invertido</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${history.summary.totalSpent.toLocaleString()}
                </span>
              </div>
            </div>

            <Tabs defaultValue="motorcycles" className="w-full flex-grow flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 mb-4 bg-foreground/5">
                <TabsTrigger value="motorcycles">Motos Registradas</TabsTrigger>
                <TabsTrigger value="services">Historial de Servicios</TabsTrigger>
                <TabsTrigger value="sales">Ventas Mostrador</TabsTrigger>
              </TabsList>
              
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <TabsContent value="motorcycles" className="m-0 space-y-3">
                  {history.motorcycles.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No hay motos registradas.</div>
                  ) : (
                    history.motorcycles.map((m: any) => (
                      <div key={m.id} className="border border-border rounded-lg p-4 bg-foreground/[0.02]">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-foreground">{m.brand} {m.model} <span className="text-muted-foreground ml-2">({m.year})</span></h4>
                            <p className="text-sm text-muted-foreground mt-1">Ingreso: {formatExactDateTime(m.createdAt)}</p>
                          </div>
                          <Badge variant="outline" className="text-base font-mono bg-background">
                            {m.plate}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="services" className="m-0 space-y-3">
                  {history.workOrders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No hay órdenes de servicio.</div>
                  ) : (
                    history.workOrders.map((wo: any) => (
                      <div key={wo.id} className="border border-border rounded-lg p-4 bg-foreground/[0.02] flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            <h4 className="font-bold text-foreground">{wo.orderNumber}</h4>
                          </div>
                          <Badge className="bg-foreground/10 text-foreground shadow-none">{wo.status}</Badge>
                        </div>
                        <p className="text-sm font-medium">Moto: <span className="text-muted-foreground">{wo.motorcycle}</span></p>
                        <p className="text-sm text-muted-foreground line-clamp-2">"{wo.issue}"</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatExactDateTime(wo.createdAt)}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="sales" className="m-0 space-y-3">
                  {history.sales.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No hay compras registradas.</div>
                  ) : (
                    history.sales.map((s: any) => (
                      <div key={s.id} className="border border-border rounded-lg p-4 bg-foreground/[0.02] flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-blue-500" />
                            <h4 className="font-bold text-foreground">{s.saleNumber}</h4>
                          </div>
                          <Badge variant="outline" className="text-foreground">{s.paymentMethod || 'N/A'}</Badge>
                        </div>
                        <p className="text-sm">Artículos: <span className="font-medium">{s.itemsCount}</span></p>
                        <p className="text-sm font-bold text-foreground mt-1">Total: ${Number(s.total).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatExactDateTime(s.createdAt)}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

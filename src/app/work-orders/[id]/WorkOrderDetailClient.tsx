'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ClipboardList,
  Bike,
  Users,
  Wrench,
  CheckCircle2,
  DollarSign,
  Package,
  Calendar,
  Activity,
  AlertCircle,
  Clock,
  Camera,
  BellRing,
  FileCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStepper } from '@/components/WorkOrderStepper';
import { QuoteStatusWidget } from '@/components/work-orders/QuoteStatusWidget';
import { SaveAndSendButton } from '@/components/work-orders/SaveAndSendButton';
import { EvidenceManager } from '@/components/work-orders/EvidenceManager';
import { SolutionForm } from '@/components/forms/SolutionForm';
import { AddItemToWorkOrder } from '@/components/forms/AddItemToWorkOrder';
import { RemoveItemFromWorkOrder } from '@/components/forms/RemoveItemFromWorkOrder';
import { AddServiceToWorkOrder } from '@/components/forms/AddServiceToWorkOrder';
import { RemoveServiceFromWorkOrder } from '@/components/forms/RemoveServiceFromWorkOrder';
import { AddDepositForm } from '@/components/forms/AddDepositForm';
import { AddReminderForm } from '@/components/forms/AddReminderForm';
import { ReassignTechnician } from '@/components/forms/ReassignTechnician';
import { PartRequestsSection } from '@/components/work-orders/PartRequestsSection';
import { StatusBadge } from '@/components/common/StatusBadge';
import WorkOrdersRealtime from '../WorkOrdersRealtime';

interface WorkOrderDetailClientProps {
  workOrder: any;
  isCompleted: boolean;
  technicians: any[];
  inventory: any;
  userRole: string;
  partRequests: any[];
  services: any[];
  reminders: any[];
  totalCost: number;
  depositAmount: number;
  pendingBalance: number;
}

export function WorkOrderDetailClient({
  workOrder,
  isCompleted,
  technicians,
  inventory,
  userRole,
  partRequests,
  services,
  reminders,
  totalCost,
  depositAmount,
  pendingBalance,
}: WorkOrderDetailClientProps) {
  const [activeTab, setActiveTab] = useState('resumen');

  return (
    <div className="w-full space-y-4 text-foreground pb-12">
      <WorkOrdersRealtime />

      {/* Sticky Top Header Bar */}
      <div className="sticky top-14 z-20 bg-background/90 backdrop-blur-md -mx-3 sm:-mx-5 md:-mx-6 px-3 sm:px-5 md:px-6 py-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/work-orders"
            className="p-2 rounded-xl bg-card hover:bg-muted border border-border/60 transition-colors shrink-0"
            title="Volver a órdenes"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold font-space text-foreground truncate">
                OT #{workOrder.workOrderNumber}
              </h1>
              <StatusBadge status={workOrder.status} />
              <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                {workOrder.motorcycle.plate || 'S/P'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {workOrder.motorcycle.make} {workOrder.motorcycle.model} • Cliente: <strong className="text-foreground">{workOrder.motorcycle.customer.name}</strong>
            </p>
          </div>
        </div>

        {/* Resumen Financiero y Acciones Inmediatas */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-between sm:justify-end">
          <div className="flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60">
              <span className="text-muted-foreground">Total: </span>
              <strong className="font-bold text-foreground">${totalCost.toLocaleString('es-CO')}</strong>
            </div>
            <div className={`px-2.5 py-1 rounded-lg border ${pendingBalance > 0 ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'}`}>
              <span>Saldo: </span>
              <span>${pendingBalance.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div className="shrink-0">
            <SaveAndSendButton 
              workOrderId={workOrder.id}
              customerPhone={workOrder.motorcycle.customer.phone || undefined}
              customerName={workOrder.motorcycle.customer.name}
              workshopName={workOrder.workshop?.name}
              orderNumber={workOrder.workOrderNumber?.toString()}
              technicianName={workOrder.technician?.name}
              quoteStatus={workOrder.quote_status}
            />
          </div>
        </div>
      </div>

      {/* Stepper dinámico y Cotización */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 p-3.5 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl shadow-sm">
          <WorkOrderStepper currentStatus={workOrder.status} />
        </div>
        <div className="lg:col-span-4 p-3.5 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl shadow-sm flex flex-col justify-center">
          <QuoteStatusWidget 
            workOrderId={workOrder.id} 
            initialStatus={workOrder.quote_status} 
            customerPhone={workOrder.motorcycle.customer.phone || undefined}
            customerName={workOrder.motorcycle.customer.name}
            workshopName={workOrder.workshop?.name}
            orderNumber={workOrder.workOrderNumber?.toString()}
            technicianName={workOrder.technician?.name}
          />
        </div>
      </div>

      {workOrder.customerObservations && workOrder.customerObservations.includes('Rechazada') && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Motivo del Rechazo de Cotización</h4>
            <p className="mt-0.5 whitespace-pre-wrap">{workOrder.customerObservations}</p>
          </div>
        </div>
      )}

      {/* Navegación Interna por Tabs de Alta Densidad */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted/40 border border-border/60 p-1 rounded-xl h-auto overflow-x-auto flex-nowrap scrollbar-none">
          <TabsTrigger value="resumen" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="trabajo" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Wrench className="w-3.5 h-3.5 text-blue-500" />
            <span>Diagnóstico & Solución</span>
          </TabsTrigger>
          <TabsTrigger value="repuestos-servicios" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Package className="w-3.5 h-3.5 text-orange-500" />
            <span>Repuestos & Servicios</span>
            {((workOrder.sales || []).flatMap((s: any) => s.saleItems || []).length + (workOrder.work_order_services || []).length) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-bold">
                {(workOrder.sales || []).flatMap((s: any) => s.saleItems || []).length + (workOrder.work_order_services || []).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagos" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Abonos & Pagos</span>
            {depositAmount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                ${depositAmount.toLocaleString('es-CO')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evidencias" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <Camera className="w-3.5 h-3.5 text-purple-500" />
            <span>Evidencias</span>
            {(workOrder.images || []).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-600 font-bold">
                {(workOrder.images || []).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recordatorios" className="text-xs font-semibold py-2 px-3 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">
            <BellRing className="w-3.5 h-3.5 text-amber-500" />
            <span>Recordatorios</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUMEN */}
        <TabsContent value="resumen" className="mt-4 space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vehículo */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bike className="w-4 h-4 text-emerald-500" />
                  Motocicleta
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Marca / Modelo:</span>
                  <span className="font-semibold text-foreground">{workOrder.motorcycle.make} {workOrder.motorcycle.model}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Placa:</span>
                  <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded text-foreground">{workOrder.motorcycle.plate || 'S/N'}</span>
                </div>
                {workOrder.motorcycle.year > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Año:</span>
                    <span className="font-medium text-foreground">{workOrder.motorcycle.year}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Fecha Ingreso:</span>
                  <span className="text-xs text-foreground font-medium">{format(new Date(workOrder.createdDate), 'dd/MM/yyyy')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Nombre:</span>
                  <span className="font-semibold text-foreground">{workOrder.motorcycle.customer.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Teléfono:</span>
                  <span className="font-medium text-foreground">{workOrder.motorcycle.customer.phone || 'No registrado'}</span>
                </div>
                {workOrder.motorcycle.customer.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Email:</span>
                    <span className="text-xs text-foreground truncate max-w-[150px]">{workOrder.motorcycle.customer.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Técnico Asignado */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  Técnico Asignado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Técnico:</span>
                  <span className="font-bold text-sm text-foreground">{workOrder.technician?.name ?? 'Sin asignar'}</span>
                </div>
                {!isCompleted && (
                  <div className="pt-2 border-t border-border/40">
                    <ReassignTechnician workOrder={workOrder} technicians={technicians} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Diagnóstico Breve */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Diagnóstico Inicial / Motivo de Ingreso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {workOrder.issueDescription || 'No se registró diagnóstico inicial o motivo de ingreso.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DIAGNÓSTICO & SOLUCIÓN */}
        <TabsContent value="trabajo" className="mt-4 space-y-4 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Motivo de Ingreso / Diagnóstico Inicial
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-sm text-foreground whitespace-pre-wrap">
                {workOrder.issueDescription || 'No se registró diagnóstico inicial.'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                Solución Aplicada
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {isCompleted ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Resumen de la solución registrada:</p>
                  <Textarea
                    readOnly
                    value={workOrder.solutionDescription ?? 'Sin solución registrada.'}
                    className="bg-muted text-foreground border-border/50 min-h-[100px] resize-none pointer-events-none text-sm"
                  />
                </div>
              ) : (
                <SolutionForm 
                  workOrderId={workOrder.id} 
                  defaultValue={workOrder.solutionDescription} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: REPUESTOS & SERVICIOS */}
        <TabsContent value="repuestos-servicios" className="mt-4 space-y-6 focus-visible:outline-none">
          {/* Insumos y Repuestos */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                Insumos y Repuestos Usados
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                Subtotal: ${((workOrder.sales || []).reduce((tot: number, s: any) => tot + (s.saleItems || []).reduce((st: number, it: any) => st + it.price * it.quantity, 0), 0)).toLocaleString('es-CO')}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {!isCompleted && (
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Agregar Repuesto del Inventario
                  </h4>
                  <AddItemToWorkOrder workOrderId={workOrder.id} inventory={inventory.items} userRole={userRole} />
                </div>
              )}

              <PartRequestsSection workOrderId={workOrder.id} requests={partRequests} userRole={userRole} />

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Repuestos en Esta Orden
                </h4>
                {!workOrder.sales || workOrder.sales.length === 0 || workOrder.sales.every((sale: any) => !sale.saleItems || sale.saleItems.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-xl">
                    No hay repuestos agregados a esta orden.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(workOrder.sales || []).flatMap((sale: any) =>
                      (sale.saleItems || []).map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.inventoryItem.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Cant: <span className="font-bold text-foreground">{item.quantity}</span> • Precio: <span className="font-bold text-foreground">${item.price.toLocaleString('es-CO')}</span>
                            </p>
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

          {/* Mano de Obra / Servicios */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-fuchsia-500" />
                Mano de Obra & Servicios
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                Subtotal: ${((workOrder.work_order_services || []).reduce((tot: number, s: any) => tot + s.total, 0)).toLocaleString('es-CO')}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {!isCompleted && (
                <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                    Agregar Servicio de Catálogo
                  </h4>
                  <AddServiceToWorkOrder workOrderId={workOrder.id} services={services} />
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Servicios Aplicados
                </h4>
                {!workOrder.work_order_services || workOrder.work_order_services.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-xl">
                    No hay servicios registrados en esta orden.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(workOrder.work_order_services || []).map((wos: any) => (
                      <div key={wos.id} className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{wos.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Categoría: {wos.service_catalog?.category || 'General'} • <span className="font-bold text-foreground">${wos.total.toLocaleString('es-CO')}</span>
                          </p>
                        </div>
                        {!isCompleted && (
                          <RemoveServiceFromWorkOrder workOrderId={workOrder.id} workOrderServiceId={wos.id} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ABONOS & PAGOS */}
        <TabsContent value="pagos" className="mt-4 space-y-4 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Gestión Financiera de la Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground font-medium">Costo Total</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">${totalCost.toLocaleString('es-CO')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Abonado</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">${depositAmount.toLocaleString('es-CO')}</p>
                </div>
                <div className={`p-3.5 rounded-xl border ${pendingBalance > 0 ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-muted/40 border-border/60 text-muted-foreground'}`}>
                  <p className="text-xs font-medium">Saldo Pendiente</p>
                  <p className="text-2xl font-bold mt-0.5">${pendingBalance.toLocaleString('es-CO')}</p>
                </div>
              </div>

              {!isCompleted ? (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Registrar Nuevo Abono</h4>
                  <AddDepositForm workOrderId={workOrder.id} currentDeposit={depositAmount} />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Orden finalizada. El saldo está liquidado.</span>
                </div>
              )}

              {/* Historial de Abonos */}
              {workOrder.depositHistory && workOrder.depositHistory.length > 0 && (
                <div className="pt-3 border-t border-border/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Historial de Abonos Recibidos
                  </h4>
                  <div className="space-y-2">
                    {workOrder.depositHistory.map((h: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-muted/30 rounded-lg border border-border/50">
                        <div>
                          <span className="font-semibold text-foreground">Abono ({h.method})</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(h.date).toLocaleDateString('es-CO')} • Por: {h.received_by}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +${Number(h.amount).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: EVIDENCIAS */}
        <TabsContent value="evidencias" className="mt-4 focus-visible:outline-none">
          <EvidenceManager 
            workOrderId={workOrder.id} 
            organizationId={workOrder.organizationId} 
            evidences={workOrder.images || []} 
          />
        </TabsContent>

        {/* TAB 6: RECORDATORIOS */}
        <TabsContent value="recordatorios" className="mt-4 focus-visible:outline-none">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <AddReminderForm workOrderId={workOrder.id} reminders={reminders} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

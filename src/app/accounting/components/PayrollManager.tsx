'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getOrganizationTechnicians, getTechnicianWork, registerPayrollPayment, TechnicianWorkSummary, getPayrollHistory, PayrollPaymentSummary } from '@/actions/accounting';
import { Loader2, Calendar, User, DollarSign, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PayrollManagerProps {
  organizationId: string;
}

export default function PayrollManager({ organizationId }: PayrollManagerProps) {
  const [technicians, setTechnicians] = useState<{id: string, name: string}[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [workItems, setWorkItems] = useState<TechnicianWorkSummary[]>([]);
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [historyItems, setHistoryItems] = useState<PayrollPaymentSummary[]>([]);
  const [historyTechFilter, setHistoryTechFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchTechs() {
      const techs = await getOrganizationTechnicians(organizationId);
      setTechnicians(techs);
      if (techs.length > 0) {
        setSelectedTech(techs[0].id);
      }
    }
    
    async function fetchHistory() {
      const history = await getPayrollHistory(organizationId);
      setHistoryItems(history);
    }

    fetchTechs();
    fetchHistory();
  }, [organizationId]);

  useEffect(() => {
    if (!selectedTech) return;

    async function fetchWork() {
      setLoading(true);
      let startDateIso: string | undefined;
      let endDateIso: string | undefined;
      
      if (startDateStr) {
        const d = new Date(startDateStr);
        // Ajustar al inicio del día (medianoche)
        d.setHours(0, 0, 0, 0);
        startDateIso = d.toISOString();
      }
      if (endDateStr) {
        const d = new Date(endDateStr);
        // Ajustar al final del día
        d.setHours(23, 59, 59, 999);
        endDateIso = d.toISOString();
      }

      try {
        const work = await getTechnicianWork(organizationId, selectedTech, startDateIso, endDateIso);
        setWorkItems(work);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchWork();
  }, [organizationId, selectedTech, startDateStr, endDateStr]);

  const totalServicesValue = workItems.reduce((acc, curr) => acc + curr.total, 0);
  const amountToPay = (totalServicesValue * commissionPct) / 100;

  const handlePay = async () => {
    if (!selectedTech || totalServicesValue === 0) {
      toast.error('No hay servicios para pagar.');
      return;
    }

    if (commissionPct <= 0 || commissionPct > 100) {
      toast.error('Ingrese un porcentaje válido (1-100).');
      return;
    }

    try {
      setProcessing(true);
      let payStartIso = new Date().toISOString();
      let payEndIso = new Date().toISOString();
      
      if (startDateStr) {
        const d = new Date(startDateStr);
        d.setHours(0, 0, 0, 0);
        payStartIso = d.toISOString();
      }
      if (endDateStr) {
        const d = new Date(endDateStr);
        d.setHours(23, 59, 59, 999);
        payEndIso = d.toISOString();
      }

      await registerPayrollPayment(
        organizationId,
        selectedTech,
        payStartIso,
        payEndIso, // use selected end date
        totalServicesValue,
        commissionPct,
        amountToPay
      );
      toast.success('Pago de nómina registrado exitosamente.');
      setWorkItems([]); // Clear list after pay or maybe re-fetch to reflect changes (if we mark them as paid, but we didn't add paid flag to work_order_services yet).
      
      // Refresh history
      const history = await getPayrollHistory(organizationId);
      setHistoryItems(history);
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left panel: Filters & Settings */}
      <Card className="bg-card border-border/50 lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Liquidación de Comisiones</CardTitle>
          <CardDescription>Configura y calcula el pago por servicios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> Técnico
            </label>
            <select 
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              disabled={technicians.length === 0}
            >
              {technicians.length === 0 ? (
                <option value="">No hay técnicos disponibles</option>
              ) : (
                technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" /> Periodo a liquidar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Desde</span>
                <input 
                  type="date"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Hasta</span>
                <input 
                  type="date"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" /> Porcentaje de Comisión (%)
            </label>
            <input 
              type="number"
              min="0"
              max="100"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej. 40"
              value={commissionPct || ''}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
            />
          </div>

          <div className="pt-4 border-t border-border/50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Servicios:</span>
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalServicesValue)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold text-emerald-500">
              <span>A Pagar:</span>
              <span>
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amountToPay)}
              </span>
            </div>
            
            <Button 
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg"
              disabled={loading || totalServicesValue === 0 || commissionPct <= 0 || processing}
              onClick={handlePay}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Registrar Pago
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right panel: Detail Table */}
      <Card className="bg-card border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle>Detalle de Servicios Realizados</CardTitle>
          <CardDescription>Trabajos completados en el periodo seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : workItems.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-muted-foreground bg-muted/10 rounded-lg">
              No hay servicios completados en este periodo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Fecha</th>
                    <th className="px-4 py-3 font-medium">Servicio</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Valor Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {workItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.service_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Panel inferior: Historial de Pagos */}
      <Card className="bg-card border-border/50 lg:col-span-3 mt-6">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Historial de Pagos</CardTitle>
            <CardDescription>Resumen de todas las nóminas pagadas a los técnicos</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar:</span>
            <select
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
              value={historyTechFilter}
              onChange={(e) => setHistoryTechFilter(e.target.value)}
            >
              <option value="all">Todos los técnicos</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Fecha de Pago</th>
                  <th className="px-4 py-3 font-medium">Técnico</th>
                  <th className="px-4 py-3 font-medium">Periodo</th>
                  <th className="px-4 py-3 font-medium text-right">Total Servicios</th>
                  <th className="px-4 py-3 font-medium text-center">% Com.</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Total Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {historyItems.filter(h => historyTechFilter === 'all' || h.technician_id === historyTechFilter).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay pagos registrados para este filtro.
                    </td>
                  </tr>
                ) : (
                  historyItems
                    .filter(h => historyTechFilter === 'all' || h.technician_id === historyTechFilter)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.technician_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(item.period_start).toLocaleDateString()} - {new Date(item.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.total_services_amount)}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {item.commission_percentage}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-500">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.total_paid)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Loader2, DollarSign, TrendingUp, TrendingDown, 
  Search, Calendar, Receipt, ChevronDown, ChevronUp, Lock, Target, Calculator, Info, CheckCircle2, AlertCircle, Users, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDailyClosingSummary, 
  DailyClosingSummary,
  closeDay,
  getDailyClosings,
  addExpense
} from '@/actions/accounting';

interface DailyClosingDashboardProps {
  organizationId: string;
}

const EXPENSE_CATEGORIES = [
  'Insumos',
  'Pago a Proveedores',
  'Nómina / Comisiones',
  'Servicios Públicos',
  'Alimentación / Tintos',
  'Otros Gastos Operativos'
];

export default function DailyClosingDashboard({ organizationId }: DailyClosingDashboardProps) {
  const [loading, setLoading] = useState(true);
  
  // Use a lazy initial state or effect to set local date safely
  const [date, setDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  
  useEffect(() => {
    // Ensure on client we match local timezone
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const local = d.toISOString().split('T')[0];
    if (date !== local && !isClosed) {
      setDate(local);
    }
  }, []);

  const [summary, setSummary] = useState<DailyClosingSummary | null>(null);
  const [closings, setClosings] = useState<any[]>([]);
  
  const [expenseCat, setExpenseCat] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseVal, setExpenseVal] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [preClosingOpen, setPreClosingOpen] = useState(false);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isClosed = closings.some(c => c.date === date);

  const getLocalBounds = (dateStr: string) => {
    if (!dateStr) return { startIso: '', endIso: '' };
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { startIso, endIso } = getLocalBounds(date);
      const [sumData, closingsData] = await Promise.all([
        getDailyClosingSummary(organizationId, date, startIso, endIso),
        getDailyClosings(organizationId)
      ]);
      setSummary(sumData);
      setClosings(closingsData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos del cierre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId, date]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseVal || Number(expenseVal) <= 0) {
      toast.error('Datos de gasto inválidos');
      return;
    }

    setSubmittingExpense(true);
    try {
      await addExpense(organizationId, expenseCat, expenseDesc, Number(expenseVal), new Date(date).toISOString());
      toast.success('Gasto registrado');
      setExpenseDesc('');
      setExpenseVal('');
      loadData(); // refresh summary
    } catch (error: any) {
      toast.error(error.message || 'Error registrando gasto');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleCloseDay = async (status: 'closed' | 'no_sales') => {
    if (!summary) return;
    setClosingDay(true);
    try {
      await closeDay(organizationId, date, status, summary);
      toast.success(status === 'no_sales' ? 'Día sin ventas registrado' : 'Día cerrado exitosamente');
      setPreClosingOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error al cerrar el día');
    } finally {
      setClosingDay(false);
    }
  };

  const balance = summary ? summary.totalIncome - summary.totalExpenses : 0;
  
  // Calcular métricas
  const totalCompletedOrders = summary?.technicianSummary.reduce((sum, t) => sum + t.totalServices, 0) || 0;
  const avgTicket = totalCompletedOrders > 0 ? (summary?.totalIncome || 0) / totalCompletedOrders : 0;
  const margin = summary?.totalIncome ? ((balance) / summary.totalIncome) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cierre Diario de Operación</h1>
          <p className="text-muted-foreground mt-1">Consolide ingresos, pagos y calcule la utilidad neta del día.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-[150px]"
          />
          <div className="h-8 w-px bg-border mx-1"></div>
          {isClosed ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg font-medium border border-emerald-500/20">
              <Lock className="w-4 h-4" /> Día Cerrado
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleCloseDay('no_sales')}
                disabled={closingDay || loading}
              >
                Día Sin Ventas
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                onClick={() => setPreClosingOpen(true)}
                disabled={closingDay || loading}
              >
                {closingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Cierre Hoy
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        </div>
      ) : summary ? (
        <>
          {/* PRE-CIERRE MODAL */}
          <Dialog open={preClosingOpen} onOpenChange={setPreClosingOpen}>
            <DialogContent className="max-w-4xl bg-card border-border/50 shadow-2xl p-0 overflow-hidden">
              <div className="bg-slate-50 border-b border-border/50 p-6 relative">
                <div className="absolute top-6 right-6 opacity-5">
                  <Calculator className="w-24 h-24 text-slate-900" />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-indigo-500 rounded-lg shadow-md shadow-indigo-500/20">
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                    1. Pre-Cierre — Revisión Automática
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium uppercase tracking-wider text-xs pt-1">
                    Revise el estado de la operación antes de cerrar el día ({new Date(date + 'T00:00:00').toLocaleDateString()})
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 bg-background space-y-6 overflow-y-auto max-h-[70vh]">
                
                {/* 4 CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border-2 border-orange-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Target className="w-6 h-6 text-orange-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Servicios</p>
                    <p className="text-2xl font-black text-foreground">{totalCompletedOrders}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Completados</p>
                  </div>
                  <div className="bg-card border-2 border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <DollarSign className="w-6 h-6 text-emerald-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Ingresos</p>
                    <p className="text-xl font-black text-emerald-500">{formatCurrency(summary.totalIncome)}</p>
                  </div>
                  <div className="bg-card border-2 border-rose-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <TrendingDown className="w-6 h-6 text-rose-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pagos/Gastos</p>
                    <p className="text-xl font-black text-rose-500">{formatCurrency(summary.totalExpenses)}</p>
                  </div>
                  <div className="bg-card border-2 border-indigo-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <Calculator className="w-6 h-6 text-indigo-500 mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Utilidad</p>
                    <p className="text-xl font-black text-indigo-500">{formatCurrency(balance)}</p>
                  </div>
                </div>

                {/* CHECKLIST */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    Checklist de Validaciones
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="bg-emerald-500 rounded-full p-1 text-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-600 text-sm">Servicios con estado finalizado</p>
                        <p className="text-xs text-emerald-600/70">{totalCompletedOrders} servicios completados</p>
                      </div>
                    </div>
                    
                    {summary.pendingOrdersCount > 0 ? (
                      <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <div className="bg-rose-500 rounded-full p-1 text-white">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-rose-600 text-sm">Hay órdenes de trabajo aún activas</p>
                          <p className="text-xs text-rose-600/70">{summary.pendingOrdersCount} servicios siguen en progreso.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="bg-emerald-500 rounded-full p-1 text-white">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-emerald-600 text-sm">Sin órdenes activas</p>
                          <p className="text-xs text-emerald-600/70">Todo ha sido cerrado o pagado.</p>
                        </div>
                      </div>
                    )}

                    {summary.pendingOrdersCount > 0 && (
                      <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-500">
                        Advertencia: Tienes {summary.pendingOrdersCount} órdenes pendientes. Se recomienda cerrar estas órdenes antes del cierre diario para que los ingresos queden registrados hoy. Aún así puedes forzar el cierre.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* DESGLOSE CAJA */}
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/20">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Desglose Detallado
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Total Ventas / Ingresos</span>
                        <span className="font-bold text-emerald-500">{formatCurrency(summary.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Total Egresos Operativos</span>
                        <span className="font-bold text-rose-500">{formatCurrency(summary.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-muted-foreground font-bold">Margen del Día</span>
                        <span className={`font-black ${balance >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>{margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* MÉTODOS DE PAGO */}
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/20">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-500" />
                      Métodos de Pago
                    </h4>
                    <div className="space-y-2">
                      {summary.incomeByPaymentMethod?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No hay ingresos registrados.</p>
                      ) : (
                        summary.incomeByPaymentMethod?.map((method, i) => (
                          <div key={i} className="flex justify-between items-center text-sm p-2 bg-background border border-border/50 rounded-lg">
                            <span className="font-medium capitalize">{method.method}</span>
                            <span className="font-bold text-emerald-500">{formatCurrency(method.total)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* TÉCNICOS */}
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/20">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      Técnicos de Hoy
                    </h4>
                    <div className="space-y-2">
                      {summary.technicianSummary.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No hay servicios registrados hoy.</p>
                      ) : (
                        summary.technicianSummary.map((tech, i) => (
                          <div key={i} className="flex justify-between items-center text-sm p-2 bg-background border border-border/50 rounded-lg">
                            <span className="font-medium">{tech.name} <span className="text-xs text-muted-foreground ml-1">({tech.totalServices})</span></span>
                            <span className="font-bold text-emerald-500">{formatCurrency(tech.totalAmount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter className="p-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row gap-2 justify-end">
                <Button variant="ghost" onClick={() => setPreClosingOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleCloseDay('closed')} 
                  disabled={closingDay}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
                >
                  {closingDay ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Continuar al Cierre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* MÉTRICAS CLAVE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Ingreso Promedio / Servicio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(avgTicket)}</div>
                <p className="text-xs text-muted-foreground mt-1">Basado en {totalCompletedOrders} servicios</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Margen del Día</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{margin.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Utilidad sobre ingresos</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Servicios Completados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalCompletedOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">En el día operativo</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PANEL DE GASTOS DE OPERACIÓN */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-card border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-indigo-500" />
                        Gastos de la Operación
                      </CardTitle>
                      <CardDescription>Registre egresos y salidas de caja del día operativo activo.</CardDescription>
                    </div>
                    <div className="px-3 py-1 bg-muted text-xs font-medium rounded-full">
                      Fecha: {new Date(date + 'T00:00:00').toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Formulario Inline */}
                  <div className={`p-4 rounded-xl border border-border/50 bg-background/50 ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Nuevo Registro de Gasto</h4>
                    <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="w-full sm:w-1/3 space-y-1.5">
                        <Label className="text-xs">Categoría</Label>
                        <Select value={expenseCat} onValueChange={setExpenseCat}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full sm:w-1/3 space-y-1.5">
                        <Label className="text-xs">Descripción</Label>
                        <Input 
                          placeholder="Ej. Pago luz..." 
                          value={expenseDesc} 
                          onChange={(e) => setExpenseDesc(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="w-full sm:w-1/3 space-y-1.5">
                        <Label className="text-xs">Valor (Pesos)</Label>
                        <Input 
                          type="number" 
                          placeholder="Ej. 45000" 
                          value={expenseVal} 
                          onChange={(e) => setExpenseVal(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <Button type="submit" disabled={submittingExpense || isClosed} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
                        {submittingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Gasto'}
                      </Button>
                    </form>
                  </div>

                  {/* Resumen de Técnicos (Adaptado) */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Rendimiento por Técnico (Hoy)
                      </h4>
                    </div>
                    {summary.technicianSummary.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Sin actividad de técnicos.</p>
                    ) : (
                      <div className="space-y-2">
                        {summary.technicianSummary.map((tech, i) => (
                          <div key={i} className="flex justify-between p-3 bg-muted/30 rounded-lg border border-border/30">
                            <span className="font-medium text-sm">{tech.name} <span className="text-xs text-muted-foreground ml-2">({tech.totalServices} svcs)</span></span>
                            <span className="font-bold text-emerald-500 text-sm">{formatCurrency(tech.totalAmount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* LISTA LATERAL DE EGRESOS DEL DÍA */}
            <div className="lg:col-span-1">
              <Card className="bg-card border-border/50 shadow-sm h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold">Egresos del Día</CardTitle>
                    <span className="text-sm font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                      Total: {formatCurrency(summary.totalExpenses)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-y-auto max-h-[400px]">
                  {summary.expensesByCategory.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground italic">
                      No hay gastos operativos registrados para esta fecha.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {summary.expensesByCategory.map((exp, i) => (
                        <div key={i} className="p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-foreground">{exp.category}</span>
                            <span className="font-bold text-rose-500 text-sm">-{formatCurrency(exp.total)}</span>
                          </div>
                          <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-muted">
                            {summary.detailedExpenses
                              .filter(d => d.category === exp.category)
                              .map(detail => (
                                <div key={detail.id} className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">{detail.description || 'Sin descripción'}</span>
                                  <span className="text-rose-500/80">-{formatCurrency(detail.amount)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* HISTORIAL DE CIERRES */}
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Historial de Cierres</h2>
                <p className="text-sm text-muted-foreground">Últimos cierres de caja registrados</p>
              </div>
            </div>

            {closings.length === 0 ? (
              <Card className="bg-card border-border/50 text-center py-10">
                <p className="text-muted-foreground">No hay cierres registrados históricamente.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {closings.map((c: any) => {
                  const isExpanded = expandedId === c.id;
                  const cdate = new Date(c.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  
                  return (
                    <div key={c.id} className="border border-border/50 rounded-xl bg-card overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
                      {/* HEADER ACORDEÓN */}
                      <div 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/10"
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      >
                        <div className="flex items-center gap-4 mb-3 sm:mb-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.status === 'no_sales' ? 'bg-amber-500/10 text-amber-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-foreground capitalize">{cdate}</h3>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${c.status === 'no_sales' ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
                                {c.status === 'no_sales' ? 'Sin Ventas' : 'Completado'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">por {c.creator_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end">
                          {c.status === 'closed' && (
                            <>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold">Ingresos</p>
                                <p className="font-bold text-emerald-500 text-sm">{formatCurrency(c.total_income)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold">Pagos/Gastos</p>
                                <p className="font-bold text-rose-500 text-sm">{formatCurrency(c.total_expenses)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold">Utilidad</p>
                                <p className={`font-bold text-sm ${c.net_balance >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>{formatCurrency(c.net_balance)}</p>
                              </div>
                            </>
                          )}
                          <div className="text-muted-foreground pl-2">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* DETALLE EXPANDIDO */}
                      {isExpanded && (
                        <div className="p-6 bg-background/30 border-t border-border/50 space-y-6">
                          
                          {/* Detalles de Ingresos */}
                          <div>
                            <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-2 mb-3 uppercase tracking-wider">
                              <TrendingUp className="w-4 h-4" /> Detalle de Ingresos
                            </h4>
                            <div className="bg-card border border-border/50 rounded-lg divide-y divide-border/50">
                              {c.details?.incomeByCategory?.length > 0 ? c.details.incomeByCategory.map((ic: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3">
                                  <span className="text-sm font-medium">{ic.category}</span>
                                  <span className="text-sm font-bold">{formatCurrency(ic.total)}</span>
                                </div>
                              )) : <div className="p-3 text-sm text-muted-foreground italic">Sin ingresos.</div>}
                            </div>
                          </div>

                          {/* Detalles de Métodos de Pago */}
                          <div>
                            <h4 className="text-xs font-bold text-indigo-500 flex items-center gap-2 mb-3 uppercase tracking-wider">
                              <CreditCard className="w-4 h-4" /> Métodos de Pago
                            </h4>
                            <div className="bg-card border border-border/50 rounded-lg divide-y divide-border/50">
                              {c.details?.incomeByPaymentMethod?.length > 0 ? c.details.incomeByPaymentMethod.map((pm: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3">
                                  <span className="text-sm font-medium capitalize">{pm.method}</span>
                                  <span className="text-sm font-bold text-emerald-500">{formatCurrency(pm.total)}</span>
                                </div>
                              )) : <div className="p-3 text-sm text-muted-foreground italic">No especificado en este cierre.</div>}
                            </div>
                          </div>

                          {/* Detalles de Egresos */}
                          <div>
                            <h4 className="text-xs font-bold text-rose-500 flex items-center gap-2 mb-3 uppercase tracking-wider">
                              <TrendingDown className="w-4 h-4" /> Detalle de Egresos (Gastos)
                            </h4>
                            <div className="bg-card border border-border/50 rounded-lg divide-y divide-border/50">
                              {c.details?.expensesByCategory?.length > 0 ? c.details.expensesByCategory.map((ec: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3">
                                  <span className="text-sm font-medium">{ec.category}</span>
                                  <span className="text-sm font-bold text-rose-500">-{formatCurrency(ec.total)}</span>
                                </div>
                              )) : <div className="p-3 text-sm text-muted-foreground italic">Sin egresos.</div>}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

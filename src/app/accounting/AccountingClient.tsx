'use client';
import type { InventoryItem } from "@/lib/types";
import { AddPurchase } from "@/components/forms/AddPurchase";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlanLimits } from '@/lib/constants/plans';
import { Lock, PieChart, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, ArrowUpRight, ArrowDownRight, Rocket, Loader2, Percent } from 'lucide-react';
import { getRealtimeFinancialDataRaw, RealtimeFinancialData, setInitialCashBase } from '@/actions/accounting';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import CategorySalesDashboard from './components/CategorySalesDashboard';
import PayrollManager from './components/PayrollManager';
import DailyClosingDashboard from './components/DailyClosingDashboard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface AccountingClientProps {
  subscriptionPlan?: string | null;
  organizationId: string;
  inventory: any[];
  purchases?: any[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const supplierData = [
  { name: 'MotoPartes SA', compras: 1250000, envios: '24h', calidad: 'Alta' },
  { name: 'Repuestos Express', compras: 850000, envios: '48h', calidad: 'Media' },
  { name: 'Frenos y Llantas', compras: 2300000, envios: '24h', calidad: 'Alta' },
];

export default function AccountingClient({ subscriptionPlan, organizationId, inventory, purchases = [] }: AccountingClientProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'flujo' | 'compras' | 'proveedores' | 'categorias' | 'nomina' | 'cierre'>('resumen');
  const [periodFilter, setPeriodFilter] = useState<'day' | 'month' | 'year'>('day');
  const [realtimeData, setRealtimeData] = useState<RealtimeFinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [baseInput, setBaseInput] = useState('');
    const [isSettingBase, setIsSettingBase] = useState(false);

  
      const handleSetBase = async (motivo: string) => {
    const rawAmount = Number(baseInput.replace(/\D/g, ''));
    if (!rawAmount || isNaN(rawAmount)) {
      toast.error('Ingrese un valor válido para la base');
      return;
    }
    
    setIsSettingBase(true);
    try {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localDate = now.toISOString().split('T')[0];
      await setInitialCashBase(organizationId, localDate, rawAmount, motivo, 'addition');
      toast.success('Movimiento de caja registrado');
      setBaseInput('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar base');
    } finally {
      setIsSettingBase(false);
    }
  };

  const planLimits = getPlanLimits(subscriptionPlan || 'basic');
  
  const isLocked = !planLimits.has_accounting;
  const isBasic = planLimits.accounting_level === 'basic';
  const isComplete = planLimits.accounting_level === 'complete';

  useEffect(() => {
    async function fetchRealtime() {
      if (activeTab !== 'resumen' && activeTab !== 'flujo') return;
      setLoading(true);
      try {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (periodFilter === 'day') {
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
        } else if (periodFilter === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (periodFilter === 'year') {
          start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }

        const data = await getRealtimeFinancialDataRaw(organizationId, start.toISOString(), end.toISOString());
        setRealtimeData(data);
      } catch (err) {
        console.error('Error fetching realtime data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRealtime();
  }, [organizationId, periodFilter, activeTab, refreshKey]);

  const { chartData, metrics, paymentMethodsData, cashFlowData } = useMemo(() => {
    if (!realtimeData) return { chartData: [], metrics: { ingresos: 0, gastos: 0, utilidad: 0, margen: 0, totalVentas: 0, label: '' }, paymentMethodsData: [], cashFlowData: { efectivoIngresado: 0, efectivoNeto: 0, otrosMetodos: 0, otrosMetodosIngresado: 0, totalOtherExpenses: 0, categorias: [], totalCashExpenses: 0, initialBase: 0, cashBases: [] } };
    
    let aggregated: Record<string, { ingresos: number, egresos: number, utilidad: number, ventas: number }> = {};
    let totalIngresos = 0;
    let totalEgresos = 0;
    let totalVentas = 0;
    
    const methodsMap: Record<string, number> = {};
    const categoriesMap: Record<string, number> = {};

    const uiMethods: Record<string, string> = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta de Crédito',
      'debit_card': 'Tarjeta de Débito',
      'transfer': 'Transferencia',
      'nequi': 'Nequi',
      'daviplata': 'DaviPlata',
      'wompi': 'Wompi',
      'other': 'Otro'
    };

    realtimeData.sales.forEach(sale => {
      const d = new Date(sale.created_at);
      let key = '';
      if (periodFilter === 'day') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (periodFilter === 'month') {
        key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      } else {
        key = d.toLocaleDateString('es-CO', { month: 'short' });
      }

      if (!aggregated[key]) aggregated[key] = { ingresos: 0, egresos: 0, utilidad: 0, ventas: 0 };
      
      const amount = Number(sale.total) || 0;
      aggregated[key].ingresos += amount;
      aggregated[key].utilidad += amount;
      aggregated[key].ventas += 1;
      
      totalIngresos += amount;
      totalVentas += 1;

      const rawMethod = sale.payment_method || 'cash';
      const methodStr = uiMethods[rawMethod] || rawMethod;
      methodsMap[methodStr] = (methodsMap[methodStr] || 0) + amount;

      sale.sale_items?.forEach((item: any) => {
        let cat = 'Otros';
        if (item.item_type === 'inventory' && item.inventory_items?.category) cat = item.inventory_items.category;
        else if (item.item_type === 'service' && item.service_catalog?.category) cat = item.service_catalog.category;
        categoriesMap[cat] = (categoriesMap[cat] || 0) + Number(item.total);
      });
    });

    let totalCashExpenses = 0;

    const addExpense = (dateStr: string, amount: number, method: string = 'Efectivo') => {
      const d = new Date(dateStr);
      let key = '';
      if (periodFilter === 'day') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (periodFilter === 'month') {
        key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      } else {
        key = d.toLocaleDateString('es-CO', { month: 'short' });
      }

      if (!aggregated[key]) aggregated[key] = { ingresos: 0, egresos: 0, utilidad: 0, ventas: 0 };
      aggregated[key].egresos += amount;
      aggregated[key].utilidad -= amount;
      totalEgresos += amount;

      if (method === 'Efectivo' || method === 'cash') {
        totalCashExpenses += amount;
      }
    };

    realtimeData.expenses.forEach(exp => addExpense(exp.date, Number(exp.amount) || 0, exp.payment_method || 'Efectivo'));
    realtimeData.payroll.forEach(pay => addExpense(pay.created_at, Number(pay.total_paid) || 0, 'Efectivo'));

    let chartData = [];
    if (periodFilter === 'day') {
      for (let i = 6; i <= 22; i++) {
        const k = `${i.toString().padStart(2, '0')}:00`;
        chartData.push({ label: k, ... (aggregated[k] || { ingresos: 0, egresos: 0, utilidad: 0, ventas: 0 }) });
      }
    } else if (periodFilter === 'month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const tempD = new Date(now.getFullYear(), now.getMonth(), i);
        const k = tempD.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        chartData.push({ label: k, ... (aggregated[k] || { ingresos: 0, egresos: 0, utilidad: 0, ventas: 0 }) });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const tempD = new Date(new Date().getFullYear(), i, 1);
        const k = tempD.toLocaleDateString('es-CO', { month: 'short' });
        chartData.push({ label: k, ... (aggregated[k] || { ingresos: 0, egresos: 0, utilidad: 0, ventas: 0 }) });
      }
    }

    const paymentMethodsData = Object.keys(methodsMap).map(k => ({ method: k, amount: methodsMap[k] })).sort((a,b) => b.amount - a.amount);
    
    let initialBase = 0;
    if (realtimeData.cash_bases) {
      initialBase = realtimeData.cash_bases.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    }

    // El total de efectivo ingresado es 'Efectivo'
    const efectivoIngresado = methodsMap['Efectivo'] || 0;
    
    // Le restamos SOLO los gastos pagados en efectivo y le sumamos la base inicial
    const efectivoNeto = efectivoIngresado - totalCashExpenses + initialBase; 
    
    const otrosMetodosIngresado = paymentMethodsData.filter(p => p.method !== 'Efectivo').reduce((sum, p) => sum + p.amount, 0);
    const totalOtherExpenses = totalEgresos - totalCashExpenses;
    const otrosMetodosNeto = otrosMetodosIngresado - totalOtherExpenses;

    const cashFlowData = {
      efectivoIngresado,
      efectivoNeto,
      otrosMetodos: otrosMetodosNeto,
      otrosMetodosIngresado,
      totalOtherExpenses,
      categorias: Object.keys(categoriesMap).map(k => ({ category: k, amount: categoriesMap[k] })).sort((a,b) => b.amount - a.amount),
      totalCashExpenses,
      initialBase,
      cashBases: realtimeData.cash_bases || []
    };

    return {
      chartData,
      paymentMethodsData,
      cashFlowData,
      metrics: {
        ingresos: totalIngresos,
        gastos: totalEgresos,
        utilidad: totalIngresos - totalEgresos,
        margen: totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0,
        totalVentas,
        label: periodFilter === 'day' ? '(Hoy)' : periodFilter === 'month' ? '(Este Mes)' : '(Este Año)'
      }
    };
  }, [realtimeData, periodFilter]);

  if (isLocked) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent opacity-50 pointer-events-none" />
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 rotate-3">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Módulo de Contabilidad Bloqueado</h2>
          <p className="text-muted-foreground text-sm mb-8">
            El análisis financiero avanzado, proyecciones y control de proveedores están disponibles en los planes Pro Taller y Full Taller.
          </p>
          <Link href="/planes" className="block">
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg border-0">
              <Rocket className="w-4 h-4 mr-2" />
              Ver Planes y Mejorar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <PieChart className="w-8 h-8 text-indigo-500" />
              Contabilidad e Inteligencia Financiera
            </h1>
            <p className="text-muted-foreground">
              {isBasic 
                ? 'Resumen financiero y métricas clave de tu taller.' 
                : 'Análisis detallado, proyecciones de IA y gestión de compras avanzada.'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-card/50 border border-border/50 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'resumen' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            Resumen Financiero
          </button>
          
          {/* Ocultamos las pestañas avanzadas si es básico */}
          <button 
            onClick={() => isBasic ? null : setActiveTab('flujo')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'flujo' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'} ${isBasic ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Flujo de Caja Detallado
            {isBasic && <Lock className="w-3 h-3" />}
          </button>

          <button 
            onClick={() => setActiveTab('categorias')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'categorias' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            Ventas por Categoría
          </button>

          <button 
            onClick={() => setActiveTab('nomina')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'nomina' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            Nómina de Técnicos
          </button>
          
          <button 
            onClick={() => setActiveTab('compras')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'compras' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'} ${isBasic ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Compras y Proveedores
            {isBasic && <Lock className="w-3 h-3" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('cierre')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'cierre' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            Cierre Diario
          </button>
        </div>

        {/* Global Period Filter for Resumen and Flujo */}
        {(activeTab === 'resumen' || activeTab === 'flujo') && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground font-medium">Periodo:</span>
            <div className="flex gap-1 p-1 bg-card/50 border border-border/50 rounded-lg">
              <button 
                onClick={() => setPeriodFilter('day')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${periodFilter === 'day' ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
              >
                Por Día
              </button>
              <button 
                onClick={() => setPeriodFilter('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${periodFilter === 'month' ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
              >
                Por Mes
              </button>
              <button 
                onClick={() => setPeriodFilter('year')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${periodFilter === 'year' ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
              >
                Por Año
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'resumen' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/50 rounded-xl text-center">
                    <PieChart className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground">Sin datos de cierre</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      No hay registros de cierres diarios para mostrar en este periodo. Ve a la pestaña "Cierre Diario" para empezar a registrar.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      <Card className="bg-card border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas {metrics.label}</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground">{metrics.totalVentas}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-card border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Neta {metrics.label}</CardTitle>
                          <DollarSign className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${metrics.utilidad >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>{formatCurrency(metrics.utilidad)}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-card border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales {metrics.label}</CardTitle>
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground">{formatCurrency(metrics.ingresos)}</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-card border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Operativos {metrics.label}</CardTitle>
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground">{formatCurrency(metrics.gastos)}</div>
                        </CardContent>
                      </Card>

                      <Card className="bg-card border-border/50 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Margen de Operación {metrics.label}</CardTitle>
                          <Percent className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${metrics.margen >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>{metrics.margen.toFixed(1)}%</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-card border-border/50">
                      <CardHeader>
                        <CardTitle>Rendimiento Financiero</CardTitle>
                        <CardDescription>Ingresos vs Egresos del periodo seleccionado.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000000}M`} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                              <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000000}M`} />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                              />
                              <Area type="monotone" dataKey="ingresos" stroke="#10b981" fillOpacity={1} fill="url(#colorIngresos)" strokeWidth={2} />
                              <Area type="monotone" dataKey="egresos" stroke="#ef4444" fillOpacity={1} fill="url(#colorEgresos)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {activeTab === 'flujo' && isComplete && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* EFECTIVO NETO */}
                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Efectivo en Caja (Neto)</CardTitle>
                      <CardDescription>Efectivo recibido menos gastos operativos pagados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${cashFlowData.efectivoNeto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(cashFlowData.efectivoNeto)}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Total en Base: <span className="font-semibold text-foreground">{formatCurrency(cashFlowData.initialBase)}</span> <br/>
                        Ingresos efectivo: {formatCurrency(cashFlowData.efectivoIngresado)} <br/>
                        Gastos deducidos: {formatCurrency(cashFlowData.totalCashExpenses)}
                      </p>
                      
                      {cashFlowData.cashBases && cashFlowData.cashBases.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Historial de Base Hoy</p>
                          {cashFlowData.cashBases.map((b: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">- {b.description || 'Adición'}</span>
                              <span className="font-medium text-emerald-500">{formatCurrency(Number(b.amount))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {periodFilter === 'day' && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <label className="text-xs font-medium text-foreground mb-1 block">Añadir a Base de Caja (Hoy)</label>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                              placeholder="Monto (Ej. $ 100.000)"
                              value={baseInput}
                              onChange={e => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                if (!rawValue) {
                                  setBaseInput('');
                                  return;
                                }
                                const formatted = new Intl.NumberFormat('es-CO', {
                                  style: 'currency',
                                  currency: 'COP',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(Number(rawValue));
                                setBaseInput(formatted);
                              }}
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                className="w-full border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                                onClick={() => handleSetBase('Apertura')} 
                                disabled={isSettingBase}
                              >
                                {isSettingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apertura'}
                              </Button>
                              <Button 
                                size="sm" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleSetBase('Adición')} 
                                disabled={isSettingBase}
                              >
                                {isSettingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sumar'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>

                  {/* OTROS MÉTODOS */}
                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bancos / Otros Métodos (Neto)</CardTitle>
                      <CardDescription>Transferencias, tarjetas menos gastos por banco</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${cashFlowData.otrosMetodos >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>
                        {formatCurrency(cashFlowData.otrosMetodos)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ingresos banco: {formatCurrency(cashFlowData.otrosMetodosIngresado)} <br/>
                        Gastos deducidos: {formatCurrency(cashFlowData.totalOtherExpenses)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle>Ingresos por Método de Pago</CardTitle>
                      <CardDescription>Desglose de cómo pagaron tus clientes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {paymentMethodsData.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No hay ingresos registrados.</p>
                        ) : (
                          paymentMethodsData.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-muted/20 border border-border/50 rounded-lg">
                              <span className="font-medium text-sm">{p.method}</span>
                              <span className="font-bold text-emerald-500">{formatCurrency(p.amount)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle>Ventas por Categoría</CardTitle>
                      <CardDescription>De dónde provienen tus ingresos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {cashFlowData.categorias.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No hay categorías registradas.</p>
                        ) : (
                          cashFlowData.categorias.map((c, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-muted/20 border border-border/50 rounded-lg">
                              <span className="font-medium text-sm">{c.category}</span>
                              <span className="font-bold text-indigo-500">{formatCurrency(c.amount)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'compras' && isComplete && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Gestión de Abastecimiento</h3>
                    <p className="text-sm text-muted-foreground">Registra facturas y reabastece tu inventario.</p>
                  </div>
                  <AddPurchase inventory={inventory} />
                </div>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      Historial de Compras (Facturas)
                    </CardTitle>
                    <CardDescription>Tus ingresos de inventario recientes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    
                    {purchases.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                        <ShoppingCart className="h-10 w-10 mb-4 opacity-50" />
                        <p>Aún no has registrado ninguna compra.</p>
                        <p className="text-sm mt-2">Usa el botón "Registrar Compra" para ingresar mercadería masivamente a tu Bodega.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                            <tr>
                              <th className="px-6 py-4 font-medium rounded-tl-lg">Fecha</th>
                              <th className="px-6 py-4 font-medium">Factura / Recibo</th>
                              <th className="px-6 py-4 font-medium">Proveedor</th>
                              <th className="px-6 py-4 font-medium">Estado</th>
                              <th className="px-6 py-4 font-medium rounded-tr-lg">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {purchases.map((p, i) => (
                              <tr key={i} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-muted-foreground">
                                  {new Date(p.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">{p.invoice_number || 'Sin número'}</td>
                                <td className="px-6 py-4 text-muted-foreground">{p.supplier?.name || 'Desconocido'}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    p.status === 'received' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    p.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {p.status === 'received' ? 'Recibida en Bodega' : p.status === 'pending' ? 'Pendiente' : p.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-indigo-500">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </CardContent>
                </Card>

                
              </div>
            )}

            {activeTab === 'categorias' && (
              <CategorySalesDashboard organizationId={organizationId} />
            )}

            {activeTab === 'nomina' && (
              <PayrollManager organizationId={organizationId} />
            )}

            {activeTab === 'cierre' && (
              <DailyClosingDashboard organizationId={organizationId} />
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Para usar el icono Sparkles interno sin fallos si no lo importamos bien.
function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

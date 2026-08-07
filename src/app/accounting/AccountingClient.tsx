'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlanLimits } from '@/lib/constants/plans';
import { Lock, PieChart, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, ArrowUpRight, ArrowDownRight, Rocket, Loader2, Percent } from 'lucide-react';
import { getDailyClosings } from '@/actions/accounting';
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
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

// Datos calculados dinámicamente desde Supabase.

const supplierData = [
  { name: 'MotoPartes SA', compras: 1250000, envios: '24h', calidad: 'Alta' },
  { name: 'Repuestos Express', compras: 850000, envios: '48h', calidad: 'Media' },
  { name: 'Frenos y Llantas', compras: 2300000, envios: '24h', calidad: 'Alta' },
];

export default function AccountingClient({ subscriptionPlan, organizationId }: AccountingClientProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'flujo' | 'compras' | 'proveedores' | 'categorias' | 'nomina' | 'cierre'>('resumen');
  const [periodFilter, setPeriodFilter] = useState<'day' | 'month' | 'year'>('day');
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const planLimits = getPlanLimits(subscriptionPlan || 'basic');
  
  const isLocked = !planLimits.has_accounting;
  const isBasic = planLimits.accounting_level === 'basic';
  const isComplete = planLimits.accounting_level === 'complete';

  useEffect(() => {
    async function fetchClosings() {
      setLoading(true);
      try {
        const data = await getDailyClosings(organizationId, 365); // Fetch up to a year of closings
        setClosings(data || []);
      } catch (err) {
        console.error('Error fetching closings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClosings();
  }, [organizationId]);

  const { chartData, metrics } = useMemo(() => {
    let aggregated: Record<string, { ingresos: number, egresos: number, utilidad: number }> = {};
    let totalIngresos = 0;
    let totalEgresos = 0;
    let totalUtilidad = 0;

    const sortedClosings = [...closings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedClosings.forEach(c => {
      const d = new Date(c.date);
      // Ajuste timezone para no desfasar
      const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000); 
      let key = '';
      
      if (periodFilter === 'day') {
        key = localDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
      } else if (periodFilter === 'month') {
        key = localDate.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
      } else if (periodFilter === 'year') {
        key = localDate.getFullYear().toString();
      }

      if (!aggregated[key]) {
        aggregated[key] = { ingresos: 0, egresos: 0, utilidad: 0 };
      }
      aggregated[key].ingresos += Number(c.total_income || 0);
      aggregated[key].egresos += Number(c.total_expenses || 0);
      aggregated[key].utilidad += Number(c.net_balance || 0);
    });

    let entries = Object.entries(aggregated);
    if (periodFilter === 'day' && entries.length > 14) {
      entries = entries.slice(entries.length - 14);
    } else if (periodFilter === 'month' && entries.length > 12) {
      entries = entries.slice(entries.length - 12);
    }

    const finalChartData = entries.map(([label, data]) => {
      totalIngresos += data.ingresos;
      totalEgresos += data.egresos;
      totalUtilidad += data.utilidad;
      return { label, ...data };
    });

    const margen = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;
    
    return {
      chartData: finalChartData,
      metrics: {
        ingresos: totalIngresos,
        gastos: totalEgresos,
        utilidad: totalUtilidad,
        margen: margen,
        label: periodFilter === 'day' ? '(Últimos 14 cierres)' : periodFilter === 'month' ? '(Últimos 12 meses)' : '(Histórico)'
      }
    };
  }, [closings, periodFilter]);

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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle>Flujo de Caja de Operaciones</CardTitle>
                    <CardDescription>Análisis detallado de entradas y salidas de efectivo para el periodo seleccionado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      {loading ? (
                        <div className="flex justify-center items-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                      ) : chartData.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                          No hay datos de flujo de caja para este periodo.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                            <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000000}M`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Legend />
                            <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'compras' && isComplete && (
              <div className="space-y-6">
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                      Análisis y Comparación de Proveedores
                    </CardTitle>
                    <CardDescription>Inteligencia de compras para optimizar tus márgenes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                          <tr>
                            <th className="px-6 py-4 font-medium rounded-tl-lg">Proveedor</th>
                            <th className="px-6 py-4 font-medium">Volumen Compras (Mes)</th>
                            <th className="px-6 py-4 font-medium">Tiempos de Envío</th>
                            <th className="px-6 py-4 font-medium rounded-tr-lg">Calificación IA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {supplierData.map((supplier, i) => (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{supplier.name}</td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(supplier.compras)}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{supplier.envios}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  supplier.calidad === 'Alta' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {supplier.calidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

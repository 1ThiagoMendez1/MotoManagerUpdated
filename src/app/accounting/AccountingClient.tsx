'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlanLimits } from '@/lib/constants/plans';
import { Lock, PieChart, TrendingUp, DollarSign, ShoppingCart, Users, ArrowUpRight, ArrowDownRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
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
}

// Mock Data
const cashFlowData = [
  { mes: 'Ene', ingresos: 4000000, egresos: 2400000 },
  { mes: 'Feb', ingresos: 3000000, egresos: 1398000 },
  { mes: 'Mar', ingresos: 2000000, egresos: 980000 },
  { mes: 'Abr', ingresos: 2780000, egresos: 3908000 },
  { mes: 'May', ingresos: 1890000, egresos: 4800000 },
  { mes: 'Jun', ingresos: 2390000, egresos: 3800000 },
  { mes: 'Jul', ingresos: 3490000, egresos: 4300000 },
];

const supplierData = [
  { name: 'MotoPartes SA', compras: 1250000, envios: '24h', calidad: 'Alta' },
  { name: 'Repuestos Express', compras: 850000, envios: '48h', calidad: 'Media' },
  { name: 'Frenos y Llantas', compras: 2300000, envios: '24h', calidad: 'Alta' },
];

export default function AccountingClient({ subscriptionPlan }: AccountingClientProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'flujo' | 'compras' | 'proveedores'>('resumen');
  const planLimits = getPlanLimits(subscriptionPlan || 'basic');
  
  const isLocked = !planLimits.has_accounting;
  const isBasic = planLimits.accounting_level === 'basic';
  const isComplete = planLimits.accounting_level === 'complete';

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
            onClick={() => isBasic ? null : setActiveTab('compras')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'compras' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'} ${isBasic ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Compras y Proveedores
            {isBasic && <Lock className="w-3 h-3" />}
          </button>
        </div>

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Neta (Mes)</CardTitle>
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">$ 4,250,000</div>
                      <p className="text-xs text-emerald-500 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> +12% vs mes anterior
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Operativos</CardTitle>
                      <TrendingUp className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">$ 1,120,000</div>
                      <p className="text-xs text-rose-500 flex items-center mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> +5% vs mes anterior
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Cuentas por Cobrar</CardTitle>
                      <Users className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">$ 850,000</div>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        3 facturas pendientes
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Proyección Cierre (IA)</CardTitle>
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold text-foreground">$ 12,500,000</div>
                      <p className="text-xs text-indigo-500 flex items-center mt-1">
                        Tendencia alcista moderada
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle>Rendimiento Financiero</CardTitle>
                    <CardDescription>Ingresos vs Egresos de los últimos meses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                          <XAxis dataKey="mes" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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
              </div>
            )}

            {activeTab === 'flujo' && isComplete && (
              <div className="space-y-6">
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle>Flujo de Caja de Operaciones</CardTitle>
                    <CardDescription>Análisis detallado de entradas y salidas de efectivo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                          <XAxis dataKey="mes" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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

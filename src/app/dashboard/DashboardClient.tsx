'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Bike,
  Wrench,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
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
  Legend
} from 'recharts';
import { useState, useEffect } from 'react';
import { getPendingReminders } from '@/lib/actions/reminders';
import { getDashboardData } from '@/lib/actions/dashboard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    ingresosMes: 0,
    motosEnTallerCount: 0,
    activeWorkOrdersCount: 0,
    stockCriticoCount: 0,
    revenueData: [] as any[],
    topPartsData: [] as any[],
    alerts: [] as any[]
  });

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Función para dibujar el reporte cuando la imagen cargue (o si falla)
    const renderReport = (imgData: HTMLImageElement | null) => {
      let startY = 20;

      if (imgData) {
        try {
          doc.addImage(imgData, 'PNG', 14, 10, 40, 15);
        } catch (e) {
          console.error('Error al agregar el logo', e);
        }
      }
      
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text("Reporte General del Taller", imgData ? 60 : 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, 14, 40);

      // Línea separadora
      doc.setDrawColor(200);
      doc.line(14, 45, doc.internal.pageSize.getWidth() - 14, 45);

      // Tabla de Resumen
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Resumen de Operaciones", 14, 55);

      const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

      const tableData = [
        ["Ingresos del Mes", formatCurrency(stats.ingresosMes)],
        ["Motos en Taller", stats.motosEnTallerCount.toString()],
        ["Órdenes Activas", stats.activeWorkOrdersCount.toString()],
        ["Stock Crítico", stats.stockCriticoCount.toString()]
      ];

      autoTable(doc, {
        startY: 60,
        head: [['Métrica', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 11, cellPadding: 4 },
        margin: { left: 14 }
      });

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Generado por MotoManager - Software de Gestión de Talleres", 14, doc.internal.pageSize.getHeight() - 10);

      doc.save("Reporte_Taller.pdf");
    };

    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => renderReport(img);
    img.onerror = () => renderReport(null);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const resStats = await getDashboardData();
        if (resStats.success && resStats.data) {
          setStats(resStats.data as any);
        }
        
        const resRem = await getPendingReminders();
        if (resRem.success && resRem.data) {
          setReminders(resRem.data);
        }
      } catch (e) {
        console.error("Error fetching dashboard data", e);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/')} className="print:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard General</h1>
              <p className="text-muted-foreground">Resumen financiero y operativo del taller.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground print:hidden"
              onClick={generatePDFReport}
            >
              Generar Reporte
            </Button>
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Top KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(stats.ingresosMes)}
                  </div>
                  <p className="text-xs text-emerald-500 flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> Actualizado
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Motos en Taller</CardTitle>
                  <Bike className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.motosEnTallerCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actualmente en servicio
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes Activas</CardTitle>
                  <Wrench className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.activeWorkOrdersCount}</div>
                  <p className="text-xs text-emerald-500 flex items-center mt-1">
                    En proceso
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Stock Crítico</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.stockCriticoCount}</div>
                  <p className={`text-xs flex items-center mt-1 ${stats.stockCriticoCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {stats.stockCriticoCount > 0 ? (
                      <><ArrowDownRight className="h-3 w-3 mr-1" /> Requiere atención</>
                    ) : (
                      <><ArrowUpRight className="h-3 w-3 mr-1" /> Stock saludable</>
                    )}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            
            {/* Revenue Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <Card className="bg-card border-border/50 h-full">
                <CardHeader>
                  <CardTitle>Flujo de Caja (Semanal)</CardTitle>
                  <CardDescription>Ingresos vs Gastos en los últimos 7 días</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px] w-full mt-4">
                    {stats.revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2f80ed" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#2f80ed" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Area type="monotone" dataKey="ingresos" stroke="#2f80ed" fillOpacity={1} fill="url(#colorIngresos)" strokeWidth={2} />
                          <Area type="monotone" dataKey="gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastos)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No hay datos suficientes
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Selling Parts Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-3">
              <Card className="bg-card border-border/50 h-full">
                <CardHeader>
                  <CardTitle>Repuestos de Mayor Rotación</CardTitle>
                  <CardDescription>Top 5 repuestos más vendidos del mes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4">
                    {stats.topPartsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topPartsData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} stroke="#888888" />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          />
                          <Bar dataKey="ventas" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                        <p>No hay datos suficientes</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Activity / Alerts */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Alertas del Taller
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.alerts.map((alert: any, i: number) => (
                    <div 
                      key={i} 
                      className={`flex items-start gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0 ${alert.link ? 'cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors' : ''}`}
                      onClick={() => alert.link && router.push(alert.link)}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${alert.urgent ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">{alert.text}</p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                  {stats.alerts.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No hay alertas recientes</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Recordatorios a Clientes
                  </CardTitle>
                  <CardDescription>Próximos mantenimientos sugeridos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reminders.length > 0 ? (
                    reminders.map((rem: any, i) => {
                      const date = new Date(rem.due_date).toLocaleDateString('es-CO');
                      return (
                        <div key={rem.id || i} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none text-foreground">{rem.customers?.name}</p>
                            <p className="text-xs text-muted-foreground">{rem.motorcycles?.make} {rem.motorcycles?.model} - {rem.service_type}</p>
                          </div>
                          <div className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {date}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay recordatorios pendientes</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
        </motion.div>
      </div>
    </div>
  );
}

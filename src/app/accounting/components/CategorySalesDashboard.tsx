'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getSalesByCategory, CategorySaleSummary } from '@/actions/accounting';
import { Loader2 } from 'lucide-react';

interface CategorySalesDashboardProps {
  organizationId: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function CategorySalesDashboard({ organizationId }: CategorySalesDashboardProps) {
  const [data, setData] = useState<CategorySaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const now = new Date();
      let startDate: string | undefined;
      
      if (dateRange === 'today') {
        const today = new Date(now.setHours(0, 0, 0, 0));
        startDate = today.toISOString();
      } else if (dateRange === 'week') {
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        startDate = lastWeek.toISOString();
      } else if (dateRange === 'month') {
        const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
        startDate = lastMonth.toISOString();
      }

      try {
        const sales = await getSalesByCategory(organizationId, startDate);
        setData(sales);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId, dateRange]);

  const totalSales = data.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card/50 p-4 rounded-xl border border-border/50">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ventas por Categoría</h2>
          <p className="text-sm text-muted-foreground">Desglose de ingresos según tipo de producto o servicio</p>
        </div>
        <select 
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
        >
          <option value="today">Hoy</option>
          <option value="week">Última Semana</option>
          <option value="month">Último Mes</option>
          <option value="all">Todo el Historial</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-card rounded-xl border border-border/50">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex justify-center items-center h-64 bg-card rounded-xl border border-border/50 text-muted-foreground">
          No hay ventas registradas en este periodo.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card border-border/50">
            <CardHeader>
              <CardTitle>Ingresos por Categoría</CardTitle>
              <CardDescription>Comparativa visual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#333" opacity={0.2} />
                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <YAxis dataKey="category" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip 
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Resumen Detallado</CardTitle>
              <CardDescription>
                Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalSales)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium text-sm">{item.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

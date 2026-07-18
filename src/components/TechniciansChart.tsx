"use client";

import { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import type { Technician } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, CheckCircle2, Clock } from "lucide-react";

export function TechniciansChart({ technicians }: { technicians: Technician[] }) {
  const [selectedTechId, setSelectedTechId] = useState<string>("all");

  const { filteredData, kpis } = useMemo(() => {
    let techList = technicians;
    if (selectedTechId !== "all") {
      techList = technicians.filter(t => t.id === selectedTechId);
    }

    let total = 0;
    let pending = 0;
    let completed = 0;

    const data = techList.map((tech) => {
      const orders = tech.workOrders || [];
      const diag = orders.filter(wo => wo.status?.toLowerCase() === 'diagnosticando').length;
      const rep = orders.filter(wo => wo.status?.toLowerCase() === 'reparado').length;
      const ent = orders.filter(wo => wo.status?.toLowerCase() === 'entregado').length;
      
      const tTotal = orders.length;
      const tPending = diag;
      const tCompleted = rep + ent;

      total += tTotal;
      pending += tPending;
      completed += tCompleted;

      return {
        name: tech.name,
        Diagnosticando: diag,
        Reparado: rep,
        Entregado: ent,
        Completadas: tCompleted,
        Pendientes: tPending,
        Total: tTotal,
      };
    }).filter(d => selectedTechId !== "all" || d.Total > 0);

    return { filteredData: data, kpis: { total, pending, completed } };
  }, [technicians, selectedTechId]);

  const COLORS = {
    Diagnosticando: '#FFBB28', // Amarillo para pendiente
    Reparado: '#0088FE',       // Azul para listo pero no entregado
    Entregado: '#00C49F',      // Verde para finalizado/entregado
  };

  const donutData = filteredData.length === 1 ? [
    { name: 'Diagnosticando', value: filteredData[0].Diagnosticando, color: COLORS.Diagnosticando },
    { name: 'Reparado', value: filteredData[0].Reparado, color: COLORS.Reparado },
    { name: 'Entregado', value: filteredData[0].Entregado, color: COLORS.Entregado },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Controles de filtro */}
      <div className="w-full flex justify-between items-center bg-card/30 p-4 rounded-lg border border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground">Filtro de Análisis</h3>
        <Select value={selectedTechId} onValueChange={setSelectedTechId}>
          <SelectTrigger className="w-[250px] bg-background">
            <SelectValue placeholder="Seleccionar técnico..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Equipo Completo (Comparativa)</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-lg p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Órdenes</p>
            <h4 className="text-2xl font-bold">{kpis.total}</h4>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">En Proceso (Diagnosticando)</p>
            <h4 className="text-2xl font-bold">{kpis.pending}</h4>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-full">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completadas / Entregadas</p>
            <h4 className="text-2xl font-bold">{kpis.completed}</h4>
          </div>
        </div>
      </div>

      {/* Área del Gráfico */}
      <div className="bg-card border border-border/50 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-semibold mb-6 text-center">
          {selectedTechId === "all" 
            ? "Comparativa de Productividad por Técnico" 
            : `Distribución de Estados - ${filteredData[0]?.name || ''}`}
        </h4>

        {kpis.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <p>No hay órdenes registradas para el criterio seleccionado.</p>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            {selectedTechId === "all" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Diagnosticando" stackId="a" fill={COLORS.Diagnosticando} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Reparado" stackId="a" fill={COLORS.Reparado} />
                  <Bar dataKey="Entregado" stackId="a" fill={COLORS.Entregado} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

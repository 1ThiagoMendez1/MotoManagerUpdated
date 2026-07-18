"use client";

import { motion } from 'framer-motion';
import { Users, Activity, DollarSign, ArrowUpRight } from 'lucide-react';

interface KpiCardsProps {
  totalWorkshops: number;
  activeWorkshops: number;
  trialingWorkshops: number;
  pastDueWorkshops: number;
  mrr: number;
  totalEarnings: number;
  monthlyPlans: number;
  annualPlans: number;
}

export default function KpiCards({ 
  totalWorkshops, 
  activeWorkshops,
  trialingWorkshops,
  pastDueWorkshops,
  mrr,
  totalEarnings,
  monthlyPlans,
  annualPlans
}: KpiCardsProps) {
  
  const conversionRate = totalWorkshops > 0 ? ((activeWorkshops / totalWorkshops) * 100).toFixed(1) : "0";

  return (
    <div className="grid gap-6 md:grid-cols-3 w-full">
      
      {/* Tarjeta 1: Ingresos */}
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative group h-full"
      >
        <div className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="relative h-full rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 backdrop-blur-md p-6 flex flex-col overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ingreso Mensual (MRR)</p>
              <h3 className="text-3xl font-bold text-foreground dark:text-white mt-1">
                ${mrr.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-border dark:border-white/5 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ganancias Totales (Wompi)</span>
              <span className="text-foreground dark:text-white font-medium">${totalEarnings.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider mt-2">
              <span className="text-blue-400">Planes Mensuales: {monthlyPlans}</span>
              <span className="text-purple-400">Anuales: {annualPlans}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tarjeta 2: Conversión */}
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative group h-full"
      >
        <div className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <div className="relative h-full rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 backdrop-blur-md p-6 flex flex-col overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Suscripciones Activas</p>
              <div className="flex items-end gap-3 mt-1">
                <h3 className="text-3xl font-bold text-foreground dark:text-white">{activeWorkshops}</h3>
                <span className="flex items-center text-sm text-emerald-400 font-medium mb-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {conversionRate}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-border dark:border-white/5">
            {/* Mini gráfico simulado de tendencia */}
            <div className="flex items-end h-8 gap-1 w-full opacity-70">
              {[30, 40, 35, 50, 45, 60, 75, 90, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/50 to-cyan-400 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tarjeta 3: Talleres */}
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative group h-full"
      >
        <div className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500 bg-gradient-to-r from-purple-500 to-pink-500" />
        <div className="relative h-full rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 backdrop-blur-md p-6 flex flex-col overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Talleres</p>
              <h3 className="text-3xl font-bold text-foreground dark:text-white mt-1">{totalWorkshops}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-border dark:border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"/> Activos</span>
              <span className="text-foreground dark:text-white font-medium">{activeWorkshops}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"/> En Demo/Trial</span>
              <span className="text-foreground dark:text-white font-medium">{trialingWorkshops}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"/> Vencidos</span>
              <span className="text-foreground dark:text-white font-medium">{pastDueWorkshops}</span>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

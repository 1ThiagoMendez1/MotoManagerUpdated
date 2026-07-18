'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, Search, ChevronDown,
  TrendingUp, DollarSign, CreditCard, Filter, Download,
  ArrowUpDown, Building2, Calendar, ReceiptText
} from 'lucide-react';

interface Payment {
  id: string;
  workshop_id: string | null;
  wompi_transaction_id: string | null;
  amount: number;
  status: string;
  payment_method_type: string;
  created_at: string;
  workshop?: {
    name: string;
  } | null;
  owner?: string;
}

interface PaymentsTabProps {
  payments: Payment[];
  totalRevenue: number;
  approvedCount: number;
  declinedCount: number;
  pendingCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  APPROVED: {
    label: 'Aprobado',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-green-500/10 text-green-400 border border-green-500/20',
  },
  DECLINED: {
    label: 'Declinado',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
  },
  ERROR: {
    label: 'Error',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
  },
  PENDING: {
    label: 'Pendiente',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  },
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentsTab({
  payments,
  totalRevenue,
  approvedCount,
  declinedCount,
  pendingCount,
}: PaymentsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filtered = useMemo(() => {
    let result = [...payments];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.workshop?.name?.toLowerCase().includes(q) ||
          p.owner?.toLowerCase().includes(q) ||
          p.wompi_transaction_id?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    result.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

    return result;
  }, [payments, search, statusFilter, sortOrder]);

  const kpis = [
    {
      label: 'Ingresos Totales',
      value: formatCOP(totalRevenue),
      sub: 'Pagos aprobados acumulados',
      icon: <DollarSign className="w-5 h-5 text-green-400" />,
      color: 'from-green-500/10 to-transparent border-green-500/20',
    },
    {
      label: 'Pagos Aprobados',
      value: approvedCount.toString(),
      sub: 'Transacciones exitosas',
      icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />,
      color: 'from-blue-500/10 to-transparent border-blue-500/20',
    },
    {
      label: 'Pagos Declinados',
      value: declinedCount.toString(),
      sub: 'Transacciones fallidas',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      color: 'from-red-500/10 to-transparent border-red-500/20',
    },
    {
      label: 'Pendientes',
      value: pendingCount.toString(),
      sub: 'En proceso',
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
      color: 'from-yellow-500/10 to-transparent border-yellow-500/20',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br border ${kpi.color} backdrop-blur-sm`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-background dark:bg-white/5 flex items-center justify-center">
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground dark:text-white tracking-tight">{kpi.value}</p>
            <p className="text-xs font-semibold text-foreground/80 dark:text-white/80 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-muted-foreground dark:text-white/40 mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-white/30" />
          <input
            type="text"
            placeholder="Buscar por taller, propietario o ID de transacción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-white/30 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="ALL" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Todos los estados</option>
            <option value="APPROVED" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Aprobados</option>
            <option value="DECLINED" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Declinados</option>
            <option value="ERROR" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Error</option>
            <option value="PENDING" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Pendientes</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-white/30 pointer-events-none" />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground/70 dark:text-white/70 hover:bg-muted dark:hover:bg-white/[0.07] hover:text-foreground dark:hover:text-white transition-all"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortOrder === 'desc' ? 'Más reciente' : 'Más antiguo'}
        </button>
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground dark:text-white/40">
          Mostrando <span className="text-foreground dark:text-white font-medium">{filtered.length}</span> de{' '}
          <span className="text-foreground dark:text-white font-medium">{payments.length}</span> transacciones
        </p>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02] overflow-hidden"
      >
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr] gap-4 px-5 py-3.5 border-b border-border dark:border-white/[0.06] bg-card dark:bg-white/[0.02]">
          {['Taller / Propietario', 'ID Transacción', 'Monto', 'Estado', 'Fecha'].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground dark:text-white/40 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border dark:divide-white/[0.05]">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center">
                  <ReceiptText className="w-6 h-6 text-muted-foreground dark:text-white/20" />
                </div>
                <p className="text-muted-foreground dark:text-white/40 text-sm">No se encontraron transacciones</p>
              </motion.div>
            ) : (
              filtered.map((payment, i) => {
                const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG['PENDING'];
                return (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr] gap-2 md:gap-4 px-5 py-4 hover:bg-muted/50 dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Taller */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground dark:text-white truncate">
                          {payment.workshop?.name || 'Sin taller'}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-white/40 truncate">
                          {payment.owner || '—'}
                        </p>
                      </div>
                    </div>

                    {/* ID Transacción */}
                    <div className="flex items-center md:block">
                      <span className="text-xs text-muted-foreground dark:text-white/30 md:hidden mr-2">ID:</span>
                      <p className="text-xs font-mono text-muted-foreground dark:text-white/50 truncate group-hover:text-foreground dark:group-hover:text-white/70 transition-colors">
                        {payment.wompi_transaction_id || '—'}
                      </p>
                    </div>

                    {/* Monto */}
                    <div className="flex items-center md:block">
                      <span className="text-xs text-muted-foreground dark:text-white/30 md:hidden mr-2">Monto:</span>
                      <p className={`text-sm font-bold ${payment.status === 'APPROVED' ? 'text-green-600 dark:text-green-400' : 'text-foreground/60 dark:text-white/60'}`}>
                        {formatCOP(payment.amount)}
                      </p>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center md:block">
                      <span className="text-xs text-muted-foreground dark:text-white/30 md:hidden mr-2">Estado:</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    {/* Fecha */}
                    <div className="flex items-center gap-1.5 md:block">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground dark:text-white/30 md:hidden shrink-0" />
                      <p className="text-xs text-muted-foreground dark:text-white/50">{formatDate(payment.created_at)}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

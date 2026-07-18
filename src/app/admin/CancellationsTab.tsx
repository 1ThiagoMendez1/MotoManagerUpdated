'use client';

import { useState, useMemo } from 'react';
import {
  HeartCrack, Search, Filter, X, CheckCircle2, Phone, MessageCircle,
  Clock, AlertTriangle, ChevronDown, TrendingDown, Users, BarChart3,
  RefreshCw, Tag, Calendar
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
import { updateCancellationStatus } from './actions';
import { useToast } from '@/hooks/use-toast';

export interface CancellationRecord {
  id: string;
  workshop_id: string;
  user_id: string;
  reason_code: string;
  reason_label: string;
  status: 'pending' | 'contacted' | 'resolved' | 'lost';
  admin_notes: string | null;
  created_at: string;
  workshop: { name: string; slug: string } | null;
  owner: { name: string; email: string; phone: string | null } | null;
}

interface Props {
  records: CancellationRecord[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-400/20',
    dot: 'bg-amber-400',
    icon: Clock,
  },
  contacted: {
    label: 'Contactado',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-400/20',
    dot: 'bg-blue-400',
    icon: Phone,
  },
  resolved: {
    label: 'Recuperado ✓',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  lost: {
    label: 'Perdido',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-400/20',
    dot: 'bg-rose-400',
    icon: X,
  },
} as const;

const REASON_EMOJI: Record<string, string> = {
  price: '💸',
  features: '🔧',
  complicated: '😕',
  not_using: '😴',
  competitor: '🔄',
  pausing: '⏸️',
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CancellationsTab({ records }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [lostForm, setLostForm] = useState<{ id: string; notes: string } | null>(null);
  const { toast } = useToast();

  const handleStatusChange = async (id: string, newStatus: CancellationRecord['status']) => {
    if (newStatus === 'lost') {
      const record = records.find(r => r.id === id);
      setLostForm({ id, notes: record?.admin_notes || '' });
      return;
    }

    // Direct save for other statuses
    setLostForm(null);
    setIsUpdating(id);
    try {
      await updateCancellationStatus(id, newStatus);
      toast({ title: 'Estado actualizado', description: 'El caso se actualizó correctamente.', variant: 'default' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveLost = async (id: string) => {
    if (!lostForm) return;
    setIsUpdating(id);
    try {
      await updateCancellationStatus(id, 'lost', lostForm.notes);
      toast({ title: 'Caso cerrado', description: 'Las notas se han guardado.', variant: 'default' });
      setLostForm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setIsUpdating(null);
    }
  };

  // KPIs
  const total = records.length;
  const pending = records.filter(r => r.status === 'pending').length;
  const recovered = records.filter(r => r.status === 'resolved').length;
  const lost = records.filter(r => r.status === 'lost').length;
  const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;

  // Top reason
  const reasonCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason_code] = (acc[r.reason_code] || 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  // Unique reasons for filter
  const uniqueReasons = [...new Set(records.map(r => r.reason_code))];

  // Filtered list
  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch =
        search === '' ||
        r.workshop?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.owner?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.reason_label?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchReason = reasonFilter === 'all' || r.reason_code === reasonFilter;
      return matchSearch && matchStatus && matchReason;
    });
  }, [records, search, statusFilter, reasonFilter]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Intentos',
            value: total,
            icon: HeartCrack,
            color: 'text-rose-400',
            bg: 'from-rose-500/15 to-rose-600/5',
            border: 'border-rose-500/20',
          },
          {
            label: 'Pendientes',
            value: pending,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'from-amber-500/15 to-amber-600/5',
            border: 'border-amber-500/20',
          },
          {
            label: 'Recuperados',
            value: recovered,
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'from-emerald-500/15 to-emerald-600/5',
            border: 'border-emerald-500/20',
          },
          {
            label: 'Tasa Retención',
            value: `${recoveryRate}%`,
            icon: TrendingDown,
            color: 'text-blue-400',
            bg: 'from-blue-500/15 to-blue-600/5',
            border: 'border-blue-500/20',
          },
        ].map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${kpi.bg} border ${kpi.border} rounded-2xl p-5 flex items-center gap-4`}>
            <div className={`p-2.5 rounded-xl bg-background dark:bg-white/5 border border-border dark:border-white/5`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-foreground dark:text-white font-bold text-2xl">{kpi.value}</p>
              <p className="text-muted-foreground dark:text-white/40 text-xs mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Insight banner ────────────────────────────────────────────── */}
      {topReason && (
        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-400/20 rounded-2xl px-5 py-4">
          <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <p className="text-foreground/70 dark:text-white/70 text-sm">
            El motivo más frecuente de cancelación es{' '}
            <span className="text-purple-600 dark:text-purple-300 font-semibold">
              "{records.find(r => r.reason_code === topReason[0])?.reason_label}"
            </span>{' '}
            con <span className="text-purple-600 dark:text-purple-300 font-semibold">{topReason[1]}</span> caso{topReason[1] > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/30" />
          <input
            type="text"
            placeholder="Buscar por taller, usuario o motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-muted dark:focus:bg-white/[0.06] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-white/30 hover:text-foreground dark:hover:text-white/60">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm text-foreground dark:text-white focus:outline-none focus:border-blue-500/50 cursor-pointer transition-all"
          >
            <option value="all" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k} className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/30 pointer-events-none" />
        </div>

        {/* Reason filter */}
        <div className="relative">
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="appearance-none bg-background dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm text-foreground dark:text-white focus:outline-none focus:border-blue-500/50 cursor-pointer transition-all"
          >
            <option value="all" className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">Todos los motivos</option>
            {uniqueReasons.map(rc => {
              const rec = records.find(r => r.reason_code === rc);
              return <option key={rc} value={rc} className="bg-background dark:bg-[#0f1320] text-foreground dark:text-white">{REASON_EMOJI[rc] || ''} {rec?.reason_label || rc}</option>;
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* ── Table / Cards ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-background dark:bg-white/5 border border-border dark:border-white/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-foreground dark:text-white font-bold text-lg mb-2">Sin registros que mostrar</h3>
          <p className="text-muted-foreground dark:text-white/40 text-sm">
            {search || statusFilter !== 'all' || reasonFilter !== 'all'
              ? 'No hay resultados para los filtros aplicados.'
              : '¡Nadie ha intentado cancelar todavía! 🎉'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header row — desktop */}
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_80px] gap-4 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground dark:text-white/30">
            <span>Taller / Propietario</span>
            <span>Motivo</span>
            <span>Estado</span>
            <span>Fecha</span>
            <span />
          </div>

          {filtered.map(record => {
            const st = STATUS_CONFIG[record.status];
            const StIcon = st.icon;
            const isExpanded = expandedId === record.id;

            return (
              <div
                key={record.id}
                className={`bg-card dark:bg-white/[0.025] border border-border dark:border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/30 dark:hover:border-white/15 hover:bg-muted/50 dark:hover:bg-white/[0.04] ${isExpanded ? 'border-blue-500/25 bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
              >
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="w-full text-left"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_1fr_80px] gap-4 px-5 py-4 items-center">
                    {/* Workshop / Owner */}
                    <div className="min-w-0">
                      <p className="text-foreground dark:text-white font-semibold text-sm truncate">
                        {record.workshop?.name || '—'}
                      </p>
                      <p className="text-muted-foreground dark:text-white/40 text-xs truncate mt-0.5">
                        {record.owner?.name || record.owner?.email || '—'}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{REASON_EMOJI[record.reason_code] || '❓'}</span>
                      <span className="text-foreground/70 dark:text-white/70 text-sm truncate">{record.reason_label}</span>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${st.bg} ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-muted-foreground dark:text-white/40 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(record.created_at)}
                      </div>
                    </div>

                    {/* Expand icon */}
                    <div className="flex justify-end">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground dark:text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-border dark:border-white/8 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      {/* Contact info */}
                      <div className="space-y-3">
                        <p className="text-muted-foreground dark:text-white/40 text-xs font-semibold uppercase tracking-widest">Datos de Contacto</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="text-foreground/70 dark:text-white/70">{record.owner?.name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="text-foreground/70 dark:text-white/70">{record.owner?.email || '—'}</span>
                          </div>
                          {record.owner?.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-foreground/70 dark:text-white/70">{record.owner.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex gap-2 mt-4">
                          {record.owner?.phone && (
                            <a
                              href={`https://wa.me/${record.owner.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${record.owner.name?.split(' ')[0] || ''}, vimos que intentaste cancelar tu MotoManager. ¿Podemos ayudarte?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/15 border border-green-400/20 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-all"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </a>
                          )}
                          {record.owner?.email && (
                            <a
                              href={`mailto:${record.owner.email}?subject=Sobre tu suscripción MotoManager&body=Hola ${record.owner.name?.split(' ')[0] || ''},`}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-400/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-all"
                            >
                              <Tag className="h-3.5 w-3.5" />
                              Email
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status + notes */}
                      <div className="space-y-3">
                        <p className="text-muted-foreground dark:text-white/40 text-xs font-semibold uppercase tracking-widest">Gestión del Caso</p>
                        <div className="flex flex-wrap gap-2">
                          {(['pending', 'contacted', 'resolved', 'lost'] as const).map(s => {
                            const cfg = STATUS_CONFIG[s];
                            const isCurrent = record.status === s;
                            const isSaving = isUpdating === record.id;
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(record.id, s)}
                                disabled={isSaving}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all
                                  ${isCurrent ? `${cfg.bg} ${cfg.color}` : 'bg-background dark:bg-white/5 border-border dark:border-white/10 text-muted-foreground dark:text-white/30 hover:bg-muted dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white/50'}
                                  ${isSaving ? 'opacity-50 pointer-events-none' : ''}
                                `}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                        
                        {lostForm?.id === record.id && (
                          <div className="mt-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-rose-400 text-xs font-semibold">Describe por qué se fue el cliente:</p>
                            <textarea
                              value={lostForm.notes}
                              onChange={(e) => setLostForm({ ...lostForm, notes: e.target.value })}
                              placeholder="Ej: Le faltaba el módulo de contabilidad..."
                              className="w-full bg-background dark:bg-black/20 border border-border dark:border-white/10 rounded-lg p-2.5 text-sm text-foreground dark:text-white focus:outline-none focus:border-rose-500/50 resize-none h-20"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setLostForm(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                                Cancelar
                              </button>
                              <button onClick={() => handleSaveLost(record.id)} disabled={isUpdating === record.id} className="px-4 py-1.5 text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-colors">
                                Guardar como Perdido
                              </button>
                            </div>
                          </div>
                        )}

                        {!lostForm?.id && record.admin_notes && (
                          <div className="bg-background dark:bg-white/5 border border-border dark:border-white/8 rounded-xl p-3 mt-2">
                            <p className="text-foreground/80 dark:text-white/70 text-xs font-medium">Notas administrativas:</p>
                            <p className="text-foreground/50 dark:text-white/50 text-xs mt-1">{record.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-muted-foreground dark:text-white/25 text-xs text-center">
          Mostrando {filtered.length} de {total} registros
        </p>
      )}
    </div>
  );
}

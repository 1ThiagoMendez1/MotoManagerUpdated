'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  User, 
  Bike, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  TrendingUp 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateAppointmentStatus } from './actions';

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  notes: string | null;
  reason: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    cedula: string | null;
  } | null;
  motorcycle: {
    id: string;
    brand: string | null;
    model: string | null;
    licensePlate: string | null;
  } | null;
  createdBy?: string | null;
  acceptedBy?: string | null;
  creatorName?: string | null;
  acceptorName?: string | null;
}

interface AppointmentsClientProps {
  initialAppointments: Appointment[];
}

export default function AppointmentsClient({ initialAppointments }: AppointmentsClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status statistics
  const total = appointments.length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  const handleStatusChange = async (id: string, newStatus: string) => {
    setProcessingId(id);
    setMessage(null);
    try {
      const result = await updateAppointmentStatus(id, newStatus);
      if (result.success) {
        setAppointments(prev => 
          prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt)
        );
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error de red al actualizar la cita.' });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: AlertCircle };
      case 'confirmed':
        return { label: 'Confirmada', color: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30', icon: CheckCircle2 };
      case 'completed':
        return { label: 'Completada', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-red-500/15 text-red-500 border-red-500/30', icon: XCircle };
      default:
        return { label: status, color: 'bg-slate-500/15 text-slate-500 border-slate-500/30', icon: AlertCircle };
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Tab filter
    if (apt.status !== activeTab) {
      return false;
    }

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const customerName = apt.customer?.name.toLowerCase() || '';
      const plate = apt.motorcycle?.licensePlate?.toLowerCase() || '';
      const brand = apt.motorcycle?.brand?.toLowerCase() || '';
      const model = apt.motorcycle?.model?.toLowerCase() || '';
      const notes = apt.notes?.toLowerCase() || '';

      return customerName.includes(query) || 
             plate.includes(query) || 
             brand.includes(query) || 
             model.includes(query) || 
             notes.includes(query);
    }

    return true;
  });

  return (
    <div className="w-full relative z-10">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 lg:mb-10 mt-2 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-2">Citas</h1>
          <p className="text-base sm:text-lg text-foreground/70">
            Agenda y control de solicitudes de servicio del cliente.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Citas', value: total, color: 'from-blue-500 to-indigo-600', icon: Calendar },
          { label: 'Pendientes', value: pending, color: 'from-amber-400 to-orange-500', icon: AlertCircle },
          { label: 'Confirmadas', value: confirmed, color: 'from-indigo-500 to-purple-600', icon: CheckCircle2 }
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className="relative overflow-hidden rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.04] backdrop-blur-md border border-foreground/[0.08] dark:border-white/[0.08] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-xs sm:text-sm font-semibold">{card.label}</span>
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.color} text-white`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Notification Toast Message */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-2xl border ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          } text-sm font-medium`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Main Container */}
      <div className="relative rounded-[32px] bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Controls Header */}
        <div className="border-b border-foreground/[0.08] dark:border-white/[0.1] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'pending', label: 'Pendientes' },
              { id: 'confirmed', label: 'Confirmadas' },
              { id: 'cancelled', label: 'Canceladas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-foreground/[0.04] dark:bg-white/[0.05] text-muted-foreground hover:bg-foreground/[0.08] dark:hover:bg-white/[0.1] hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, placa o servicio..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/40 border border-foreground/[0.08] dark:border-white/[0.1] rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="p-6 sm:p-8">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredAppointments.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Sin citas</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    No se encontraron citas que coincidan con los filtros seleccionados.
                  </p>
                </motion.div>
              ) : (
                filteredAppointments.map(apt => {
                  const statusCfg = getStatusConfig(apt.status);
                  const StatusIcon = statusCfg.icon;
                  const aptDate = new Date(apt.scheduledStart);
                  const isProcessing = processingId === apt.id;

                  return (
                    <motion.div
                      key={apt.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 rounded-2xl bg-foreground/[0.02] dark:bg-white/[0.02] border border-foreground/[0.06] dark:border-white/[0.06] hover:bg-foreground/[0.04] dark:hover:bg-white/[0.04] transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Date & Service Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-blue-500 text-sm font-bold leading-none">
                            {format(aptDate, 'dd', { locale: es })}
                          </span>
                          <span className="text-blue-500/70 text-[10px] uppercase font-bold leading-none mt-1">
                            {format(aptDate, 'MMM', { locale: es })}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-foreground mb-1">
                            {apt.notes || 'Cita de servicio'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(aptDate, "h:mm a", { locale: es })} ({format(aptDate, "EEEE d 'de' MMMM", { locale: es })})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Customer & Vehicle Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-8 shrink-0">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente</span>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{apt.customer?.name || 'Cliente desconocido'}</span>
                          </div>
                          {apt.customer?.phone && (
                            <span className="block text-xs text-muted-foreground ml-5">{apt.customer.phone}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vehículo</span>
                          <div className="flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {apt.motorcycle ? `${apt.motorcycle.brand || ''} ${apt.motorcycle.model || ''}`.trim() : 'Sin moto'}
                            </span>
                          </div>
                          {apt.motorcycle?.licensePlate && (
                            <Badge className="bg-slate-800 text-slate-300 font-mono text-[10px] uppercase px-2 py-0.5 mt-0.5 rounded ml-5">
                              {apt.motorcycle.licensePlate}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gestión</span>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              Creado: <span className="font-semibold text-foreground">{apt.creatorName || 'Cliente (Portal)'}</span>
                            </div>
                            {apt.acceptorName ? (
                              <div>
                                Aceptado: <span className="font-semibold text-foreground">{apt.acceptorName}</span>
                              </div>
                            ) : (
                              apt.status === 'confirmed' ? (
                                <div>
                                  Aceptado: <span className="text-muted-foreground italic">Sistema / Auto</span>
                                </div>
                              ) : (
                                <div className="text-amber-500 italic">
                                  Pendiente aprobación
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-foreground/[0.06] dark:border-white/[0.06]">
                        <Badge className={`${statusCfg.color} text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </Badge>

                        {/* Action buttons */}
                        <div className="flex gap-1.5">
                          {apt.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-8 px-3"
                              >
                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl h-8 px-3"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}

                          {apt.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl h-8 px-3"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

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
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { AddAppointment } from '@/components/forms/AddAppointment';
import { updateAppointmentStatus } from './actions';
import type { Motorcycle, Technician } from '@/lib/types';

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
  motorcycles: Motorcycle[];
  technicians: Technician[];
}

export default function AppointmentsClient({ initialAppointments, motorcycles, technicians }: AppointmentsClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status statistics
  const total = appointments.length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;

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
        return { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', icon: AlertCircle };
      case 'confirmed':
        return { label: 'Confirmada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 };
      case 'completed':
        return { label: 'Completada', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-red-500/10 text-red-500 border-red-500/30', icon: XCircle };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground border-border', icon: AlertCircle };
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
    <div className="w-full space-y-4">
      {/* Module Header */}
      <PageHeader
        icon={Calendar}
        iconBg="bg-blue-500/10 text-blue-500"
        title="Citas"
        description="Agenda y control de solicitudes de servicio del cliente."
        badge={
          <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
            {total} {total === 1 ? 'registrada' : 'registradas'}
          </Badge>
        }
        actions={
          <AddAppointment motorcycles={motorcycles} technicians={technicians} />
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Total Citas</span>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">{total}</span>
        </div>

        <div className="rounded-xl bg-card border border-border/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Pendientes</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-amber-500">{pending}</span>
        </div>

        <div className="rounded-xl bg-card border border-border/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Confirmadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-emerald-500">{confirmed}</span>
        </div>

        <div className="rounded-xl bg-card border border-border/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Canceladas</span>
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-red-500">{cancelled}</span>
        </div>
      </div>

      {/* Notification Toast Message */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border text-sm font-medium ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Controls: Segmented Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 rounded-xl shadow-sm">
        {/* Segmented status tabs */}
        <div className="flex items-center p-1 bg-muted/60 rounded-lg shrink-0 gap-1 overflow-x-auto">
          {[
            { id: 'pending', label: 'Pendientes', count: pending },
            { id: 'confirmed', label: 'Confirmadas', count: confirmed },
            { id: 'cancelled', label: 'Canceladas', count: cancelled }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'bg-background/50 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente, placa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-background border border-border rounded-lg pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {filteredAppointments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 flex flex-col items-center justify-center bg-card border border-border/60 rounded-xl"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Sin citas</h3>
              <p className="text-muted-foreground text-xs max-w-sm">
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="p-4 rounded-xl bg-card border border-border/60 hover:border-border transition-all duration-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  {/* Date & Service Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-primary text-sm font-bold leading-none">
                        {format(aptDate, 'dd', { locale: es })}
                      </span>
                      <span className="text-primary/80 text-[9px] uppercase font-bold leading-none mt-1">
                        {format(aptDate, 'MMM', { locale: es })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">
                          {apt.notes || 'Cita de servicio'}
                        </h4>
                        <Badge variant="outline" className={`${statusCfg.color} text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(aptDate, "h:mm a", { locale: es })} ({format(aptDate, "EEEE d 'de' MMMM", { locale: es })})</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Vehicle Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs shrink-0 lg:w-[480px]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente</span>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">{apt.customer?.name || 'Cliente desconocido'}</span>
                      </div>
                      {apt.customer?.phone && (
                        <span className="block text-[11px] text-muted-foreground pl-5">{apt.customer.phone}</span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vehículo</span>
                      <div className="flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {apt.motorcycle ? `${apt.motorcycle.brand || ''} ${apt.motorcycle.model || ''}`.trim() : 'Sin moto'}
                        </span>
                      </div>
                      {apt.motorcycle?.licensePlate && (
                        <div className="pl-5">
                          <span className="inline-block px-1.5 py-0.2 bg-muted text-[10px] font-mono uppercase font-bold rounded border border-border/70">
                            {apt.motorcycle.licensePlate}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gestión</span>
                      <div className="text-[11px] text-muted-foreground">
                        <div>Por: <span className="font-medium text-foreground">{apt.creatorName || 'Portal'}</span></div>
                        {apt.acceptorName ? (
                          <div>Aceptó: <span className="font-medium text-foreground">{apt.acceptorName}</span></div>
                        ) : (
                          <div className={apt.status === 'confirmed' ? 'text-muted-foreground italic' : 'text-amber-500 italic'}>
                            {apt.status === 'confirmed' ? 'Auto' : 'Pendiente'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 border-t lg:border-t-0 pt-2 lg:pt-0 border-border/40 shrink-0">
                    {apt.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(apt.id, 'confirmed')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg h-7 px-2.5 text-xs font-medium"
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(apt.id, 'cancelled')}
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg h-7 px-2.5 text-xs font-medium"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}

                    {apt.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg h-7 px-2.5 text-xs font-medium"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

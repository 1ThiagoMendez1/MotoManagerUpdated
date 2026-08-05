'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Bike,
  User,
  FileText,
  CalendarPlus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  LogOut,
} from 'lucide-react'
import { createCustomerAppointment, cancelCustomerAppointment } from './actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

type PortalData = {
  workshopName: string
  customer: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  }
  motorcycle: {
    id: string
    brand: string
    model: string
    year?: number | null
    licensePlate: string
  }
  workOrders: Array<{
    id: string
    orderNumber: string
    reportedSymptoms?: string | null
    technicalDiagnosis?: string | null
    quoteStatus?: string | null
    quoteRespondedAt?: string | null
    status: string
    createdAt: string
    workshopName: string
    mechanicName?: string | null
  }>
  appointments: Array<{
    id: string
    scheduledStart: string
    scheduledEnd?: string | null
    status: string
    notes?: string | null
    createdAt: string
  }>
}

const SERVICE_TYPES = [
  'Revisión general',
  'Cambio de aceite',
  'Diagnóstico',
  'Mantenimiento preventivo',
  'Reparación de frenos',
  'Revisión eléctrica',
  'Revisión de suspensión',
  'Cambio de llantas',
  'Otro',
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00',
]

export function ClientPortalContent({ data, auth }: { data: PortalData; auth: string }) {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleAppointmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    const formData = new FormData(e.currentTarget)
    formData.set('motorcycleId', data.motorcycle.id)
    formData.set('customerId', data.customer.id)

    const result = await createCustomerAppointment(formData)
    setSubmitResult(result)
    setIsSubmitting(false)

    if (result.success) {
      setShowAppointmentForm(false)
      // Reload to show new appointment
      window.location.reload()
    }
  }

  const handleCancelAppointment = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      const result = await cancelCustomerAppointment(id);
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.message);
      }
    }
  }

  const getQuoteStatusInfo = (status: string | null | undefined) => {
    switch (status) {
      case 'approved':
        return { label: 'Aprobada', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 }
      case 'rejected':
        return { label: 'Rechazada', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle }
      case 'pending':
        return { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertCircle }
      default:
        return { label: 'Sin cotización', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: HelpCircle }
    }
  }

  const getWorkOrderStatusInfo = (status: string) => {
    switch (status) {
      case 'intake':
        return { label: 'Ingreso a revisión', color: 'bg-blue-500/15 text-blue-400' }
      case 'diagnosis':
        return { label: 'Diagnosticando', color: 'bg-amber-500/15 text-amber-400' }
      case 'repair':
        return { label: 'En reparación', color: 'bg-indigo-500/15 text-indigo-400' }
      case 'completed':
        return { label: 'Reparado', color: 'bg-emerald-500/15 text-emerald-400' }
      case 'delivered':
        return { label: 'Entregado', color: 'bg-green-500/15 text-green-400' }
      default:
        return { label: status, color: 'bg-slate-500/15 text-slate-400' }
    }
  }

  const getAppointmentStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
      case 'scheduled':
        return { label: 'Programada', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
      case 'confirmed':
        return { label: 'Confirmada', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' }
      case 'in_progress':
        return { label: 'En progreso', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
      case 'completed':
        return { label: 'Completada', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-red-500/15 text-red-400 border-red-500/30' }
      default:
        return { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
    }
  }

  // Get today's date in YYYY-MM-DD format for the date input min
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-600/15 via-slate-900/5 to-transparent pointer-events-none" />

      <main className="relative max-w-3xl mx-auto px-4 py-10 sm:py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-5 shadow-inner ring-1 ring-blue-500/20">
            <Wrench className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
            Portal del Cliente
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
            {data.workshopName}
          </h2>
          <p className="text-slate-400 text-base">
            Bienvenido, <span className="text-slate-200 font-medium">{data.customer.name}</span>
          </p>
        </div>

        <div className="space-y-5">

          {/* Customer & Motorcycle Info */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20 py-4">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-200">
                <Bike className="w-5 h-5 text-indigo-400" />
                Tu Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Motocicleta</p>
                  <p className="text-slate-200 font-medium">{data.motorcycle.brand} {data.motorcycle.model}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Placa</p>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-slate-300 font-mono text-sm">
                    {data.motorcycle.licensePlate}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Cliente</p>
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {data.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Contacto</p>
                  <div className="flex flex-col gap-1">
                    {data.customer.phone && (
                      <p className="text-slate-400 text-sm flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {data.customer.phone}
                      </p>
                    )}
                    {data.customer.email && (
                      <p className="text-slate-400 text-sm flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        {data.customer.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quotations / Work Orders */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20 py-4">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-200">
                <FileText className="w-5 h-5 text-amber-400" />
                Cotizaciones y Órdenes de Trabajo
                {data.workOrders.length > 0 && (
                  <span className="ml-auto text-xs text-slate-500 font-normal">
                    {data.workOrders.length} {data.workOrders.length === 1 ? 'registro' : 'registros'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-0 px-0">
              {data.workOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No tienes órdenes de trabajo registradas.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {data.workOrders.map((wo) => {
                    const quoteInfo = getQuoteStatusInfo(wo.quoteStatus)
                    const statusInfo = getWorkOrderStatusInfo(wo.status)
                    const QuoteIcon = quoteInfo.icon

                    return (
                      <div key={wo.id} className="p-4 sm:p-5 hover:bg-slate-800/20 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-slate-200 font-semibold text-sm">
                                Orden #{wo.orderNumber}
                              </span>
                              <Badge className={`${statusInfo.color} border-none text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p suppressHydrationWarning className="text-slate-500 text-xs">
                              {format(new Date(wo.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                              {wo.mechanicName && <> · Técnico: {wo.mechanicName}</>}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className={`${quoteInfo.color} border text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1`}>
                              <QuoteIcon className="w-3 h-3" />
                              {quoteInfo.label}
                            </Badge>
                          </div>
                        </div>

                        {wo.reportedSymptoms && (
                          <p className="text-slate-400 text-xs mb-3 line-clamp-2 leading-relaxed">
                            <span className="text-slate-500 font-semibold">Problema: </span>
                            {wo.reportedSymptoms}
                          </p>
                        )}

                        {wo.quoteStatus && (
                          <Link
                            href={`/cotizacion/${wo.id}?auth=${auth}`}
                            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors group"
                          >
                            Ver cotización completa
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-200">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Mis Citas
                </CardTitle>
                <Button
                  onClick={() => {
                    setShowAppointmentForm(!showAppointmentForm)
                    setSubmitResult(null)
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg shadow-lg shadow-blue-500/20"
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                  Agendar Cita
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-0 px-0">

              {/* New Appointment Form */}
              {showAppointmentForm && (
                <div className="p-5 border-b border-slate-800/60 bg-slate-800/10">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-blue-400" />
                    Agendar Nueva Cita
                  </h3>

                  {submitResult && !submitResult.success && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                      {submitResult.message}
                    </div>
                  )}

                  <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                        Tipo de Servicio
                      </label>
                      <select
                        name="serviceType"
                        required
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecciona un servicio...</option>
                        {SERVICE_TYPES.map((service) => (
                          <option key={service} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                          Fecha
                        </label>
                        <input
                          suppressHydrationWarning
                          type="date"
                          name="date"
                          required
                          min={today}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                          Hora
                        </label>
                        <select
                          name="time"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Selecciona...</option>
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot.replace(':', ':')} hrs
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                        Notas adicionales <span className="text-slate-600">(opcional)</span>
                      </label>
                      <textarea
                        name="notes"
                        placeholder="Describe brevemente el problema o lo que necesitas..."
                        rows={3}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-5 text-sm shadow-lg shadow-blue-500/20 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Agendando...
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Agendar Cita
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowAppointmentForm(false)}
                        variant="outline"
                        className="bg-transparent border-slate-700 hover:bg-slate-800/50 text-slate-400 rounded-xl py-5 text-sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Success message */}
              {submitResult?.success && (
                <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">{submitResult.message}</span>
                  </div>
                </div>
              )}

              {/* Appointments list */}
              {data.appointments.length === 0 && !showAppointmentForm ? (
                <div className="p-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm mb-1">No tienes citas registradas.</p>
                  <p className="text-slate-600 text-xs">Agenda tu primera cita con el botón de arriba.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {data.appointments.map((apt) => {
                    const statusInfo = getAppointmentStatusInfo(apt.status)
                    const aptDate = new Date(apt.scheduledStart)

                    return (
                      <div key={apt.id} className="p-4 sm:p-5 hover:bg-slate-800/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center shrink-0">
                              <span suppressHydrationWarning className="text-blue-400 text-xs font-bold leading-none">
                                {format(aptDate, 'dd', { locale: es })}
                              </span>
                              <span suppressHydrationWarning className="text-blue-400/60 text-[9px] uppercase font-semibold leading-none mt-0.5">
                                {format(aptDate, 'MMM', { locale: es })}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-200 font-medium text-sm mb-0.5">
                                {apt.notes || 'Cita de servicio'}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span suppressHydrationWarning className="text-slate-300">
                                  {format(aptDate, "h:mm a", { locale: es })}
                                </span>
                                </span>
                                <span suppressHydrationWarning className="text-slate-400 text-xs capitalize">
                                  {format(aptDate, "EEEE d 'de' MMMM", { locale: es })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className={`${statusInfo.color} border text-[10px] font-semibold px-2 py-0.5 rounded-lg`}>
                              {statusInfo.label}
                            </Badge>
                            {(apt.status === 'pending' || apt.status === 'confirmed') && (
                              <button
                                onClick={() => handleCancelAppointment(apt.id)}
                                className="text-[10px] font-medium text-slate-500 hover:text-red-400 underline underline-offset-2 transition-colors"
                              >
                                Cancelar cita
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Cerrar sesión
          </Link>
        </div>
      </main>
    </div>
  )
}

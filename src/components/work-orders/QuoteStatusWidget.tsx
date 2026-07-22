'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle, Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendQuoteWhatsApp } from '@/lib/actions/work-orders'

type QuoteStatus = 'pending' | 'approved' | 'rejected' | null

interface QuoteStatusWidgetProps {
  workOrderId: string
  initialStatus: QuoteStatus
  customerPhone?: string
  customerName?: string
  workshopName?: string
  orderNumber?: string
  technicianName?: string
}

export function QuoteStatusWidget({
  workOrderId,
  initialStatus,
  customerPhone,
  customerName,
  workshopName,
  orderNumber,
  technicianName
}: QuoteStatusWidgetProps) {
  const [status, setStatus] = useState<QuoteStatus>(initialStatus)
  const [isSending, setIsSending] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Realtime subscription to work order quote status updates
    const channel = supabase
      .channel('work_orders_quote_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
          filter: `id=eq.${workOrderId}`
        },
        (payload) => {
          if (payload.new && payload.new.quote_status !== undefined) {
            setStatus(payload.new.quote_status)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workOrderId, supabase])

  const sendWhatsApp = async () => {
    if (!customerPhone) return;

    setIsSending(true)
    const portalUrl = `${window.location.origin}/cotizacion/${workOrderId}`
    
    try {
      await sendQuoteWhatsApp(
        workOrderId,
        customerPhone,
        customerName || 'Cliente',
        workshopName || 'tu taller',
        portalUrl,
        orderNumber,
        technicianName
      )
      // Optionally show a toast notification here
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
      <div className="flex items-center gap-3">
        {status === 'approved' && (
          <>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Cotización Aprobada</p>
              <p className="text-xs text-muted-foreground">El cliente aprobó la cotización.</p>
            </div>
          </>
        )}
        {status === 'rejected' && (
          <>
            <div className="p-2 bg-red-500/10 rounded-full">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Cotización Rechazada</p>
              <p className="text-xs text-muted-foreground">El cliente rechazó la cotización.</p>
            </div>
          </>
        )}
        {(status === 'pending' || status === null || status === undefined) && (
          <>
            <div className="p-2 bg-amber-500/10 rounded-full">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Cotización Pendiente</p>
              <p className="text-xs text-muted-foreground">Esperando enviar/respuesta del cliente.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { sendQuoteWhatsApp } from '@/lib/actions/work-orders'
import { useState } from 'react'

interface SaveAndSendButtonProps {
  workOrderId: string
  customerPhone?: string
  customerName?: string
  workshopName?: string
  orderNumber?: string
  technicianName?: string
}

export function SaveAndSendButton({
  workOrderId,
  customerPhone,
  customerName,
  workshopName,
  orderNumber,
  technicianName
}: SaveAndSendButtonProps) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)

  const handleSaveAndSend = async () => {
    if (customerPhone) {
      setIsSending(true)
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://192.168.200.100:3000' 
        : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        
      const portalUrl = `${baseUrl}/cotizacion/${workOrderId}`
      
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
      } catch (error) {
        console.error('Failed to send WhatsApp message:', error)
      } finally {
        setIsSending(false)
      }
    }
    
    // Redirect back to work orders list
    router.push('/work-orders')
  }

  return (
    <Button 
      onClick={handleSaveAndSend}
      disabled={isSending}
      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-base md:text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
    >
      <Save className="w-5 h-5" />
      {isSending ? 'Enviando...' : 'Guardar y enviar'}
    </Button>
  )
}

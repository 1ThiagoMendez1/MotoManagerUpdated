'use client'

import { Button } from '@/components/ui/button'
import { Save, Copy, CheckCircle2, AlertCircle, XCircle, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { sendQuoteWhatsApp } from '@/lib/actions/work-orders'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'mock' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  })

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const portalUrl = `${baseUrl}/cotizacion/${workOrderId}`

  const accessCode = workOrderId.substring(0, 8).toUpperCase();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(portalUrl)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = portalUrl
        textArea.style.position = "absolute"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
        } catch (err) {
          throw new Error('Fallback copying failed')
        }
        document.body.removeChild(textArea)
      }
      setCopied(true)
      toast({
        title: '¡Copiado!',
        description: 'El enlace se ha copiado al portapapeles.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo copiar el enlace, por favor cópialo manualmente.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveAndSend = async () => {
    setIsSending(true)
    
    try {
      const result = await sendQuoteWhatsApp(
        workOrderId,
        customerPhone || '',
        customerName || 'Cliente',
        workshopName || 'tu taller',
        portalUrl,
        orderNumber,
        technicianName
      )
      
      if (result && result.success === false) {
          console.error('Action error:', result.error)
          const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
          setDialogState({
            isOpen: true,
            title: 'No se pudo enviar el WhatsApp',
            message: errorMsg,
            type: 'error'
          })
          setIsSending(false)
          return // Stop redirect
      }

      if (result && result.mockMessage) {
          setDialogState({
            isOpen: true,
            title: '¡Simulación de WhatsApp!',
            message: `Destinatario: ${result.mockTo}\n\n${result.mockMessage}`,
            type: 'mock'
          })
          setIsSending(false)
          return // Stop redirect
      }
    } catch (error) {
      console.error('Failed to save and send:', error)
      setDialogState({
        isOpen: true,
        title: 'Error inesperado',
        message: (error as any).message,
        type: 'error'
      })
      setIsSending(false)
      return // Stop redirect
    } finally {
      setIsSending(false)
    }
    // Redirect back to work orders list if success (no error/mock)
    router.push('/work-orders')
  }

  const handleCloseDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }))
    router.push('/work-orders')
  }

  return (
    <>
      <Button 
        onClick={handleSaveAndSend}
        disabled={isSending}
        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-base md:text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {isSending ? 'Enviando...' : 'Guardar y enviar'}
      </Button>

      <Dialog open={dialogState.isOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog()
      }}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <div className={`absolute top-0 left-0 w-full h-1 ${dialogState.type === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
          
          <DialogHeader className="pt-4 pb-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              {dialogState.type === 'error' ? (
                <XCircle className="h-8 w-8 text-red-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-amber-500" />
              )}
            </div>
            <DialogTitle className="text-center text-xl font-semibold tracking-tight">
              {dialogState.title}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto px-2">
              {dialogState.message}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Comparte el enlace manualmente:
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input 
                    readOnly
                    value={portalUrl}
                    className="pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Send className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <Button 
                  onClick={handleCopy}
                  variant={copied ? "default" : "secondary"}
                  size="icon"
                  className={`shrink-0 transition-all ${copied ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25 shadow-lg' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  title="Copiar enlace"
                >
                  {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                Envía este enlace directo al cliente para que vea y apruebe su cotización de inmediato.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 sm:justify-center">
            <Button 
              onClick={handleCloseDialog}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 transition-all rounded-xl"
            >
              Continuar a órdenes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

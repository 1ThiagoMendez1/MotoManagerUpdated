'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { notifyAdminLowStock } from '@/lib/actions/inventory'
import { useToast } from '@/hooks/use-toast'

export function NotifyAdminLowStockButton({ hasLowStock }: { hasLowStock: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handleNotify = async () => {
        setIsLoading(true)
        try {
            const result = await notifyAdminLowStock()
            if (result.success) {
                toast({
                    title: 'Éxito',
                    description: 'Notificación enviada al dueño por WhatsApp.'
                })
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Error al enviar la notificación.',
                    variant: 'destructive'
                })
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Error al enviar la notificación.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (!hasLowStock) return null

    return (
        <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
            onClick={handleNotify}
            disabled={isLoading}
        >
            <MessageCircle className="h-4 w-4" />
            {isLoading ? 'Avisando...' : 'Avisar Stock Bajo'}
        </Button>
    )
}

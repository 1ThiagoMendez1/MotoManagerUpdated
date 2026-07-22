import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { submitQuoteResponse } from './actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bike, CheckCircle2, AlertCircle, Wrench, Package, Clock, Camera, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function QuotePage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ auth?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const providedAuth = resolvedSearchParams.auth
  const supabase = createAdminClient()

  // Fetch work order data bypassing RLS
  const { data: workOrder, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      work_order_number,
      issue_description,
      solution_description,
      quote_status,
      quote_responded_at,
      deposit_amount,
      status,
      created_at,
      motorcycles (
        make,
        model,
        plate,
        clientes (
          name
        )
      ),
      workshops (
        name
      ),
      tecnicos_activos (
        name
      ),
      images:work_order_images (
        id, image_url, description
      )
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error || !workOrder) {
    notFound()
  }

  if (providedAuth !== String(workOrder.work_order_number)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
        <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden relative z-10">
          <CardHeader className="border-b border-slate-800/60 bg-slate-800/20 text-center py-8">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-200">
              Ver Cotización
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <p className="text-slate-400 text-base mb-8 text-center leading-relaxed">
              Para proteger tu información, por favor ingresa el <strong className="text-slate-200">número de orden</strong> que recibiste por WhatsApp.
            </p>
            {providedAuth && providedAuth !== String(workOrder.work_order_number) && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                Número de orden incorrecto. Intenta de nuevo.
              </div>
            )}
            <form method="GET" className="space-y-6">
              <input 
                type="text" 
                name="auth" 
                placeholder="Número de orden (Ej: 1234)" 
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-200 text-lg placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center tracking-widest"
                required
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 text-lg shadow-lg shadow-blue-500/20 transition-all">
                Ingresar a mi cotización
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch sales and items
  const { data: saleData } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      sale_items (
        id,
        quantity,
        price,
        inventory_items (
          name
        )
      )
    `)
    .eq('work_order_id', resolvedParams.id)
    .maybeSingle()

  const mc = workOrder.motorcycles as any
  const customer = mc?.clientes
  const workshop = workOrder.workshops as any
  const tech = workOrder.tecnicos_activos as any
  
  const saleItems = saleData?.sale_items || []
  const totalCost = saleData?.total || 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-600/20 via-slate-900/5 to-transparent pointer-events-none" />

      <main className="relative max-w-3xl mx-auto px-4 py-12 sm:py-20">
        
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-6 shadow-inner ring-1 ring-blue-500/20">
            <Wrench className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-3">
            Cotización de Servicio
          </h1>
          <p className="text-slate-400 text-lg">
            Taller {workshop?.name || 'Asociado'}
          </p>
        </div>

        {/* Status Alert if Already Responded */}
        {workOrder.quote_status === 'approved' && (
          <div className="mb-12 max-w-2xl mx-auto p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex flex-col items-center justify-center text-center gap-4 animate-fade-in shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2 tracking-tight">Cotización Aprobada</h3>
              <p className="text-emerald-400/80 text-base">
                Aprobaste esta cotización el {format(new Date(workOrder.quote_responded_at), "d 'de' MMMM, yyyy 'a las' h:mm a", { locale: es })}.
              </p>
            </div>
          </div>
        )}

        {workOrder.quote_status === 'rejected' && (
          <div className="mb-12 max-w-2xl mx-auto p-8 bg-red-500/10 border border-red-500/30 rounded-3xl flex flex-col items-center justify-center text-center gap-4 animate-fade-in shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-400 mb-2 tracking-tight">Cotización Rechazada</h3>
              <p className="text-red-400/80 text-base">
                Rechazaste esta cotización el {format(new Date(workOrder.quote_responded_at), "d 'de' MMMM, yyyy 'a las' h:mm a", { locale: es })}.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Info Card */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-200">
                <Bike className="w-5 h-5 text-indigo-400" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Motocicleta</p>
                  <p className="text-slate-200 font-medium">{mc.make} {mc.model}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Placa</p>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-slate-300 font-mono text-sm">
                    {mc.plate}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Cliente</p>
                  <p className="text-slate-200">{customer?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Técnico</p>
                  <p className="text-slate-200">{tech?.name || 'Asignado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solution & Description */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-200">
                <Clock className="w-5 h-5 text-amber-400" />
                Detalles del Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Problema Reportado</p>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 text-slate-300 text-sm leading-relaxed">
                  {workOrder.issue_description || 'No especificado.'}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Solución Propuesta</p>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 text-slate-300 text-sm leading-relaxed">
                  {workOrder.solution_description || 'El técnico aún no ha redactado una solución.'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidencias Fotográficas */}
          {workOrder.images && workOrder.images.length > 0 && (
            <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-slate-800/60 bg-slate-800/20">
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-200">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  Evidencia Fotográfica
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workOrder.images.map((img: any) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-800/50 bg-slate-950/50 aspect-video shadow-sm">
                      <Image
                        src={img.image_url}
                        alt={img.description || 'Evidencia'}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <p className="text-slate-200 text-sm font-medium leading-relaxed drop-shadow-md">
                          {img.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parts List */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800/60 bg-slate-800/20">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-slate-200">
                <Package className="w-5 h-5 text-emerald-400" />
                Repuestos e Insumos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-0 px-0">
              {saleItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No hay repuestos registrados en esta cotización.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {saleItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-5 hover:bg-slate-800/30 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-slate-200 mb-1">{item.inventory_items?.name}</p>
                        <p className="text-xs text-slate-500">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-200">${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                        <p className="text-xs text-slate-500">${item.price.toLocaleString('es-CO')} c/u</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <div className="border-t border-slate-800/60 bg-slate-800/40 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Subtotal</span>
                <span className="font-semibold text-slate-200">${totalCost.toLocaleString('es-CO')}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Abono Realizado</span>
                <span className="font-semibold text-blue-400">
                  - ${(workOrder.deposit_amount || 0).toLocaleString('es-CO')}
                </span>
              </div>

              <div className="h-px w-full bg-slate-700/50 my-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium text-lg">Saldo Estimado</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ${Math.max(0, totalCost - (workOrder.deposit_amount || 0)).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          {(workOrder.quote_status === 'pending' || workOrder.quote_status === null) && (
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form action={submitQuoteResponse.bind(null, workOrder.id, 'rejected')}>
                <Button 
                  type="submit" 
                  variant="outline" 
                  className="w-full py-6 text-lg bg-transparent border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all rounded-xl"
                >
                  Rechazar Cotización
                </Button>
              </form>
              <form action={submitQuoteResponse.bind(null, workOrder.id, 'approved')}>
                <Button 
                  type="submit"
                  className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all rounded-xl border border-emerald-500/50"
                >
                  Aprobar Cotización
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

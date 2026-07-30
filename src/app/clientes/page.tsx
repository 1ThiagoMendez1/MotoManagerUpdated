import { getCustomerPortalData } from './actions'
import { ClientPortalContent } from './ClientPortalContent'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const providedAuth = resolvedSearchParams.auth

  // If no auth provided, show the plate verification form
  if (!providedAuth) {
    return <PlateVerificationForm />
  }

  // Fetch customer data using the plate
  const result = await getCustomerPortalData(providedAuth)

  if (!result.success || !result.data) {
    return <PlateVerificationForm error="No se encontró ninguna motocicleta con esa placa. Verifica e intenta de nuevo." providedAuth={providedAuth} />
  }

  return <ClientPortalContent data={result.data} auth={providedAuth} />
}

function PlateVerificationForm({ error, providedAuth }: { error?: string; providedAuth?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-600/10 via-slate-900/5 to-transparent pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800/60 shadow-xl overflow-hidden relative z-10">
        <CardHeader className="border-b border-slate-800/60 bg-slate-800/20 text-center py-8">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-200">
            Portal del Cliente
          </CardTitle>
          <p className="text-slate-500 text-sm mt-2">
            Consulta tus cotizaciones y agenda citas de servicio
          </p>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <p className="text-slate-400 text-base mb-8 text-center leading-relaxed">
            Ingresa la <strong className="text-slate-200">placa de tu vehículo</strong> para acceder a tu información.
          </p>
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <form method="GET" className="space-y-6">
            <input
              type="text"
              name="auth"
              placeholder="Placa del Vehículo (Ej: XYZ123)"
              defaultValue={providedAuth || ''}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-200 text-lg placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center tracking-widest uppercase"
              required
            />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 text-lg shadow-lg shadow-blue-500/20 transition-all">
              Acceder a mi portal
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-slate-600 text-xs mt-8 text-center max-w-sm">
        Tu información está protegida. Solo podrás ver los datos asociados a la placa de tu vehículo.
      </p>
    </div>
  )
}

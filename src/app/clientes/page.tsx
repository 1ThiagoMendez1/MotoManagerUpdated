import { getCustomerPortalData, getCustomerPortalOverview } from './actions'
import { ClientPortalContent } from './ClientPortalContent'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { ProfileAvatarUploader } from '@/components/profile/ProfileAvatarUploader'

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
    const overview = await getCustomerPortalOverview();
    return <CustomerOverview overview={overview} />
  }

  // Fetch customer data using the plate
  const result = await getCustomerPortalData(providedAuth)

  if (!result.success || !result.data) {
    return <PlateVerificationForm error={result.message || "No es posible consultar esta motocicleta."} providedAuth={providedAuth} />
  }

  return <ClientPortalContent data={result.data} auth={providedAuth} />
}


function CustomerOverview({ overview }: { overview: Awaited<ReturnType<typeof getCustomerPortalOverview>> }) {
  return <div className="min-h-screen bg-slate-950 px-4 py-12 text-white">
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3 text-blue-400"><Wrench className="h-7 w-7" /><span className="text-xs font-bold uppercase tracking-widest">MotoManager · Mi garaje</span></div>
      <h1 className="text-3xl font-bold">Tus motos. Tus talleres. Todo en un lugar.</h1>
      {overview.verified && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-semibold">Mi perfil</h2>
        <ProfileAvatarUploader initialUrl={overview.avatarUrl} />
        <p className="mt-3 text-xs text-slate-400">Tu fotografía es privada y no se muestra junto a tus opiniones públicas.</p>
      </div>}
      {!overview.verified ? <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Accede con tu cuenta verificada</h2>
        <p className="mt-3 text-slate-300">Escanea el QR de tu taller y verifica tu correo para conectar tus motocicletas de forma segura.</p>
        <Button asChild className="mt-5"><Link href="/">Volver a MotoManager</Link></Button>
      </div> : <>
        {overview.workshops.length ? <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Mis talleres</h2>
          <div className="mt-3 flex flex-wrap gap-2">{overview.workshops.map(w => <span key={w.id} className="rounded-full bg-blue-500/15 px-3 py-2 text-sm text-blue-300">{w.name}</span>)}</div>
        </section> : <p className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300">Aún no estás vinculado a ningún taller. Escanea su QR para empezar.</p>}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Mis motocicletas</h2>
          {overview.motorcycles.length ? <div className="grid gap-4 sm:grid-cols-2">{overview.motorcycles.map(m => <div key={m.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">{m.workshopName}</p>
            <h3 className="mt-3 text-xl font-semibold">{[m.brand, m.model].filter(Boolean).join(' ') || 'Mi moto'}</h3>
            <p className="mt-1 text-sm text-slate-400">Placa: {m.licensePlate}</p>
            <Button asChild className="mt-5 w-full"><Link href={`/clientes?auth=${encodeURIComponent(m.licensePlate)}`}>Ver historial y solicitar citas</Link></Button>
          </div>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-300"><p className="font-semibold">Tu garaje está listo para empezar.</p><p className="mt-2 text-sm">Cuando tu taller asocie una motocicleta con tu ficha, aparecerá aquí automáticamente. No necesitas crear otra cuenta.</p></div>}
        </section>
      </>}
    </div>
  </div>;
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
            Consulta tus cotizaciones y citas tras iniciar sesión con tu cuenta verificada
          </p>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <p className="text-slate-400 text-base mb-8 text-center leading-relaxed">
            Inicia sesión con tu cuenta verificada y después introduce la <strong className="text-slate-200">placa de tu vehículo</strong>. La placa por sí sola no permite acceder a datos privados.
          </p>
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-400 mb-4 text-center">¿Aún no tienes cuenta? Solicita en tu taller el código QR de registro para verificar tu correo.</p>
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
          <Link href="/login" className="block text-center text-blue-300 underline mt-5">Iniciar sesión</Link>
        </CardContent>
      </Card>

      <p className="text-slate-600 text-xs mt-8 text-center max-w-sm">
        Tu información está protegida. Solo podrás ver los vehículos vinculados a tu cuenta verificada.
      </p>
    </div>
  )
}

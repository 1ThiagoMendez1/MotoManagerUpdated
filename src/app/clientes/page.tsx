import Link from 'next/link';
import { ArrowRight, Bike, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock3, House, MapPin, MessageCircle, ShieldCheck, Star, UserRound, Wrench } from 'lucide-react';
import { getCustomerPortalData, getCustomerPortalOverview, type CustomerPortalOverview } from './actions';
import { ClientPortalContent } from './ClientPortalContent';
import { CustomerPortalAccess } from './CustomerPortalAccess';
import { CustomerSignOut } from './CustomerSignOut';
import { ProfileAvatarUploader } from '@/components/profile/ProfileAvatarUploader';

export const dynamic = 'force-dynamic';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; moto?: string }>;
}) {
  const overview = await getCustomerPortalOverview();
  if (!overview.verified) return <CustomerPortalAccess />;
  // A valid Supabase session without any workshop/customer association is not
  // authorized to view the garage, regardless of plate or URL parameters.
  if (!overview.workshops.length) return <NoWorkshopAccess />;

  const query = await searchParams;
  const selected = query.moto || query.auth;
  if (selected) {
    const detail = await getCustomerPortalData(selected);
    if (detail.success && detail.data) {
      // Existing quotation links accept the plate as a legacy parameter.
      // Motorcycle selection itself now uses an opaque UUID in the URL.
      return <ClientPortalContent data={detail.data} auth={detail.data.motorcycle.licensePlate} />;
    }
    return <CustomerOverview overview={overview} error={detail.message || 'No pudimos encontrar esa moto en tu cuenta.'} />;
  }

  return <CustomerOverview overview={overview} />;
}

function NoWorkshopAccess() {
  return <main className="grid min-h-screen place-items-center bg-[#071423] px-4 py-12 text-white">
    <section className="w-full max-w-lg rounded-[28px] border border-white/15 bg-[#101f32] p-7 text-center shadow-2xl sm:p-10">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/10 text-orange-400"><ShieldCheck size={31}/></span>
      <h1 className="mt-5 text-3xl font-black tracking-tight">Tu garaje todavía no está vinculado</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">La sesión está verificada, pero no existe un vínculo de cliente con un taller MotoManager activo. No puedes consultar motos, servicios ni citas hasta que un taller confirme tu registro.</p>
      <Link href="/#workshops" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 font-bold text-slate-950">Buscar mi taller y solicitar su QR <ArrowRight size={18}/></Link>
      <div className="mt-4 flex justify-center"><CustomerSignOut /></div>
    </section>
  </main>;
}

function CustomerOverview({ overview, error }: { overview: CustomerPortalOverview; error?: string }) {
  const bikeCount = overview.motorcycles.length;
  const workshopCount = overview.workshops.length;
  const firstName = overview.displayName?.trim().split(/\s+/)[0] || '';
  return <main className="relative min-h-screen overflow-hidden bg-[#071321] px-4 pb-20 pt-8 text-white sm:py-12">
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-52 h-[550px] w-[550px] rounded-full bg-orange-400/[0.08] blur-[130px]" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-40 h-[480px] w-[480px] rounded-full bg-emerald-500/[0.08] blur-[130px]" />
    <div className="relative mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight sm:text-base"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-400"><Wrench size={21}/></span>MotoManager <span className="font-normal text-slate-400">/ Mi garaje</span></Link>
        <CustomerSignOut />
      </header>

      <section className="mt-8 overflow-hidden rounded-[27px] border border-white/15 bg-gradient-to-br from-[#153a32] via-[#102d2d] to-[#102339] p-6 sm:mt-10 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200"><CheckCircle2 size={14}/> Cuenta vinculada a tu taller</span>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{firstName ? '¡Hola, '+firstName+'!' : '¡Bienvenido a tu garaje!'}</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">Todo lo que tus talleres han vinculado contigo: motocicletas, servicios, órdenes y próximas visitas. Sin buscar papeles ni chats antiguos.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-2xl border border-white/15 bg-black/20 p-4"><Bike className="h-5 w-5 text-orange-300"/><strong className="mt-2 block text-3xl font-black">{bikeCount}</strong><span className="text-xs text-slate-300">{bikeCount===1?'Moto vinculada':'Motos vinculadas'}</span></div>
          <div className="rounded-2xl border border-white/15 bg-black/20 p-4"><House className="h-5 w-5 text-emerald-300"/><strong className="mt-2 block text-3xl font-black">{workshopCount}</strong><span className="text-xs text-slate-300">{workshopCount===1?'Taller asociado':'Talleres asociados'}</span></div>
        </div>
      </section>

      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div>
          <section aria-labelledby="garage-bikes-title">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 id="garage-bikes-title" className="text-xl font-black tracking-tight sm:text-2xl">Mis motocicletas</h2><span className="rounded-full bg-orange-400/10 px-3 py-1.5 text-xs font-bold text-orange-300">{bikeCount} registradas</span></div>
            {overview.motorcycles.length ? <div className="grid gap-4 sm:grid-cols-2">
              {overview.motorcycles.map(m=><article key={m.id} className="group rounded-[23px] border border-white/15 bg-[#101f31] p-5 transition-colors hover:border-orange-400/45">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-400/10 text-orange-400"><Bike size={25}/></span>
                  <span className="rounded-lg border border-white/15 bg-black/20 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-slate-200">{m.licensePlate || 'SIN PLACA'}</span>
                </div>
                <h3 className="mt-5 text-lg font-black">{[m.brand,m.model].filter(Boolean).join(' ') || 'Mi motocicleta'}</h3>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-400"><MapPin size={14}/>{m.workshopName}</p>
                <Link href={'/clientes?moto='+encodeURIComponent(m.id)} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-bold text-slate-950 transition hover:bg-orange-400">Ver historial, órdenes y citas <ArrowRight size={17}/></Link>
              </article>)}
            </div> : <div className="rounded-[23px] border border-dashed border-white/20 bg-[#101f31] p-7 text-center">
              <Bike className="mx-auto h-10 w-10 text-slate-500"/>
              <h3 className="mt-4 text-lg font-bold">Tu garaje está listo para empezar</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Tu registro sí está vinculado. Cuando recepción confirme tu motocicleta, aparecerá aquí automáticamente.</p>
            </div>}
          </section>

          <section aria-labelledby="customer-benefits-title" className="mt-8">
            <h2 id="customer-benefits-title" className="text-xl font-black tracking-tight sm:text-2xl">Ventajas de tener tu garaje digital</h2>
            <p className="mt-2 text-sm text-slate-400">Funciones reales incluidas para clientes vinculados, sin prometer descuentos ni puntos inexistentes.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {title:'Historial a la mano',text:'Consulta órdenes de reparación asociadas a tus motos.',Icon:ClipboardList},
                {title:'Seguimiento de servicio',text:'Revisa diagnósticos y estados registrados por tu taller.',Icon:Clock3},
                {title:'Citas más fáciles',text:'Solicita visitas y consulta el estado de tus citas.',Icon:CalendarDays},
                {title:'Opiniones verificadas',text:'Comparte tu experiencia tras una orden entregada.',Icon:Star},
              ].map(({title,text,Icon})=><article key={title} className="rounded-2xl border border-white/10 bg-[#0d1c2b] p-4">
                <Icon className="h-5 w-5 text-orange-300"/><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
              </article>)}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-[23px] border border-white/15 bg-[#101f31] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold"><UserRound size={18} className="text-orange-400"/> Mi perfil</h2>
            <div className="mt-4"><ProfileAvatarUploader initialUrl={overview.avatarUrl} name={overview.displayName || undefined}/></div>
            <p className="mt-3 text-xs leading-5 text-slate-400">Tu foto es privada y no aparece junto a las opiniones públicas del taller.</p>
          </section>
          <section className="rounded-[23px] border border-white/15 bg-[#101f31] p-5">
            <h2 className="flex items-center gap-2 text-base font-bold"><House size={18} className="text-emerald-400"/> Mis talleres</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">Puedes estar asociado a varios talleres. Cada uno administra únicamente su propia ficha de cliente.</p>
            <div className="mt-4 space-y-2">
              {overview.workshops.map(w=><Link key={w.id} href={'/talleres/'+encodeURIComponent(w.slug)}
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold hover:border-emerald-300/30">
                <span className="truncate">{w.name}</span><ChevronRight size={17} className="shrink-0 text-emerald-300"/>
              </Link>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">¿Otra moto? Entra al taller y selecciona «Informar otra motocicleta». Recepción revisará su vinculación.</p>
          </section>
          <section className="rounded-[23px] border border-orange-400/20 bg-orange-400/[0.07] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-orange-200"><MessageCircle size={17}/> ¿Necesitas ayuda?</h2>
            <p className="mt-2 text-xs leading-6 text-slate-300">Si no ves una moto o un servicio, comunícate con recepción para que revise tu ficha. Nadie puede asociar vehículos solo escribiendo una placa.</p>
            <Link href="/#workshops" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-orange-300">Buscar otro taller <ArrowRight size={15}/></Link>
          </section>
        </aside>
      </div>
      <p className="mt-9 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15}/> Datos asociados solo a tu cuenta verificada, separados por taller.</p>
    </div>
  </main>;
}

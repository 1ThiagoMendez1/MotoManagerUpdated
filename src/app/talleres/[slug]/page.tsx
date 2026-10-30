import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicStorefrontFromRow } from '@/lib/workshops/enrollment';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import EnrollmentForm from './EnrollmentForm';
import { WorkshopImage } from '@/components/workshops/WorkshopImage';
import { publicWorkshopImageUrl } from '@/lib/workshops/public-image';
import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Wrench, Star, ThumbsUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkshopStorefront({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ auth_error?: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) notFound();
  // Old public_workshop_storefront RPC returns null if registrations are paused,
  // turning an otherwise valid printed QR into a 404. A server-only read gives
  // us the real workshop; the allowlist helper strips all private settings.
  const admin = createAdminClient();
  const { data: organization, error: lookupError } = await admin
    .from('organizations')
    .select('id, name, slug, phone, status, settings')
    .eq('slug', slug)
    .maybeSingle();
  if (lookupError) throw new Error('No se pudo cargar el taller. Intenta de nuevo más tarde.');
  const data = publicStorefrontFromRow(organization);
  if (!data) notFound();
  const { data: reputationRows } = await (admin as any).rpc('get_public_workshop_reputation');
  const reputation = ((reputationRows || []) as any[]).find(item => item.organization_id === data.id);

  const supabase = await createClient();
  const [auth, query] = await Promise.all([supabase.auth.getUser(), searchParams]);
  const user = auth.data.user;
  const email = user?.email_confirmed_at ? user.email || null : null;
  let alreadyLinked = false;
  if (user && email) {
    const { data: link, error: linkError } = await admin
      .from('workshop_customer_accounts')
      .select('customer_id')
      .eq('organization_id', data.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (linkError) console.error('[public-workshop] Could not check customer association');
    alreadyLinked = Boolean(link);
  }
  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:py-20">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-widest text-primary"><Wrench className="h-5 w-5" /> MI TALLER · MOTOMANAGER</div>
      <section className="overflow-hidden rounded-3xl border bg-card shadow-xl">
        <WorkshopImage name={data.name} className="h-48 w-full sm:h-56"
          src={publicWorkshopImageUrl(organization?.settings, data.id, process.env.NEXT_PUBLIC_SUPABASE_URL!)} />
        <div className="border-b bg-primary/5 p-7 sm:p-9">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><CheckCircle2 className="h-4 w-4" /> Escaneaste el QR correcto</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Bienvenido a {data.name}</h1>
          {(data.address || data.city) && <p className="mt-4 flex gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{[data.address, data.city].filter(Boolean).join(' · ')}</p>}
          {reputation?.review_count > 0 && <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {Number(reputation.average_rating).toFixed(1)} / 5 · {reputation.review_count} opiniones verificadas
            </p>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <ThumbsUp className="h-4 w-4" />
              {Math.round(100 * Number(reputation.recommendation_count) / Number(reputation.review_count))}% lo recomienda
            </p>
            {reputation.recent_public_comment && <blockquote className="mt-3 border-l-2 border-amber-500/50 pl-3 italic">
              “{reputation.recent_public_comment}” — Cliente verificado
            </blockquote>}
          </div>}
          <p className="mt-5 text-muted-foreground">Regístrate con un código de WhatsApp, vincula tu cuenta con el taller y consulta tus motos, órdenes y citas.</p>
        </div>
        <div className="p-7 sm:p-9">
          <EnrollmentForm workshop={data} email={email} alreadyLinked={alreadyLinked} authError={!!query.auth_error} />
        </div>
      </section>
      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><strong className="text-primary">01 · Identifícate</strong><p className="mt-1 text-xs text-muted-foreground">Verifica tu celular con un código de WhatsApp.</p></div>
        <div className="rounded-xl border bg-card p-4"><strong className="text-primary">02 · Vincúlate</strong><p className="mt-1 text-xs text-muted-foreground">Tu ficha queda en {data.name}.</p></div>
        <div className="rounded-xl border bg-card p-4"><strong className="text-primary">03 · Conecta</strong><p className="mt-1 text-xs text-muted-foreground">Tus motos e historial, desde el portal.</p></div>
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Tu acceso se verifica con un código privado de WhatsApp o con una contraseña existente. El QR no permite consultar historias de servicio ni da acceso a la administración del taller.</p>
      <Link href="/clientes" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Ir al portal de clientes <ArrowRight className="h-4 w-4" /></Link>
    </main>
  );
}

import { requireWorkshop } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, Star, MessageSquare, ThumbsUp, ShieldCheck, Share2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkshopReputationPage() {
  const account = await requireWorkshop();
  if (!['owner','admin'].includes(account.role)) notFound();
  const admin = createAdminClient();
  const [{ data: org }, { data: rows, error }, { data: reputation }] = await Promise.all([
    admin.from('organizations').select('name,slug').eq('id', account.workshopId!).single(),
    (admin as any).from('customer_service_reviews')
      .select('id,rating,recommended,comment,publish_comment,created_at,work_order_id')
      .eq('organization_id', account.workshopId)
      .order('created_at', { ascending: false }).limit(200),
    (admin as any).rpc('get_public_workshop_reputation'),
  ]);
  const reviews = (rows || []) as Array<{
    id: string; rating: number; recommended: boolean; comment: string;
    publish_comment: boolean; created_at: string;
  }>;
  const metrics = ((reputation || []) as any[]).find(item => item.organization_id === account.workshopId);
  const count = metrics ? Number(metrics.review_count) : reviews.length;
  const average = metrics ? Number(metrics.average_rating) :
    (count ? reviews.reduce((sum, x) => sum + x.rating, 0) / count : 0);
  const recommended = metrics ? Number(metrics.recommendation_count) : reviews.filter(x => x.recommended).length;
  const negative = reviews.filter(x => x.rating <= 3).length;
  const url = org?.slug ? 'https://motomanager.com.co/talleres/' + org.slug : null;
  return (
    <main className="mx-auto max-w-5xl space-y-7 p-5 md:p-10">
      <Link href="/dashboard/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a mi perfil
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Reputación verificada</p>
        <h1 className="mt-2 text-3xl font-bold">Opiniones sobre {org?.name || 'tu taller'}</h1>
        <p className="mt-3 text-muted-foreground">
          Opiniones de clientes con una orden entregada. No filtramos reseñas por su calificación.
        </p>
      </div>
      {error && <p className="rounded-xl border border-destructive/30 p-5 text-destructive">
        No se pudo cargar la información. Prueba a recargar la página.
      </p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl border bg-card p-6">
          <Star className="mb-3 h-6 w-6 text-amber-500" />
          <div className="text-3xl font-bold">{count ? average.toFixed(1) + '/5' : '—'}</div>
          <p className="mt-1 text-sm text-muted-foreground">{count} valoraciones verificadas</p>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <ThumbsUp className="mb-3 h-6 w-6 text-emerald-500" />
          <div className="text-3xl font-bold">{count ? Math.round(100 * recommended / count) + '%' : '—'}</div>
          <p className="mt-1 text-sm text-muted-foreground">Recomiendan el taller</p>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <MessageSquare className="mb-3 h-6 w-6 text-blue-500" />
          <div className="text-3xl font-bold">{negative}</div>
          <p className="mt-1 text-sm text-muted-foreground">De las últimas 200 opiniones, 3 estrellas o menos</p>
        </section>
      </div>
      <section className="rounded-2xl border bg-card p-5 md:p-6">
        <h2 className="text-lg font-semibold">Convierte buenas experiencias en nuevas visitas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Invita a tus clientes a valorar desde «Mi garaje» después de entregar la motocicleta.
          Si quieren recomendarte, podrán compartir tu enlace por WhatsApp voluntariamente.
          Nunca ofrezcas descuentos condicionados a dar cinco estrellas.
        </p>
        {url && <a href={'https://wa.me/?text=' + encodeURIComponent('Conoce mi taller en MotoManager: ' + url)}
          target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Share2 className="h-4 w-4" /> Compartir mi taller
        </a>}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Comentarios recibidos</h2>
        {!count ? <p className="rounded-2xl border border-dashed p-8 text-muted-foreground">
          Todavía no hay valoraciones. Aparecerán aquí después de que los clientes recojan sus motos y dejen su opinión verificada.
        </p> : <div className="space-y-4">{reviews.map(review => <article key={review.id} className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {review.rating}/5
              <span className="text-sm font-normal text-muted-foreground">{review.recommended ? '· Lo recomienda' : '· No lo recomienda'}</span>
            </span>
            <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('es-CO')}</span>
          </div>
          {review.comment && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.comment}</p>}
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Servicio entregado ·
            {review.publish_comment && review.comment ? ' El cliente autorizó publicar el comentario' :
              ' Comentario privado para el taller'}
          </p>
        </article>)}</div>}
      </section>
    </main>
  );
}

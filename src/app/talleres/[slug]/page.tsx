import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { storefrontSchema } from '@/lib/workshops/enrollment';
import EnrollmentForm from './EnrollmentForm';
import { MapPin, ShieldCheck, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkshopStorefront({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ auth_error?: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,150}$/.test(slug)) notFound();
  const supabase = await createClient();
  const [workshop, auth, query] = await Promise.all([
    supabase.rpc('public_workshop_storefront', { p_slug: slug }),
    supabase.auth.getUser(), searchParams,
  ]);
  if (workshop.error) throw new Error('No se pudo cargar el taller. Intenta de nuevo más tarde.');
  const parsed = storefrontSchema.safeParse(workshop.data);
  if (!parsed.success) notFound();
  const data = parsed.data;
  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:py-20">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-widest text-primary"><Wrench className="h-5 w-5" /> MI TALLER · MOTOMANAGER</div>
      <section className="overflow-hidden rounded-3xl border bg-card shadow-xl">
        <div className="border-b bg-primary/5 p-7 sm:p-9">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Tu moto tiene un lugar</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{data.name}</h1>
          {(data.address || data.city) && <p className="mt-4 flex gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{[data.address, data.city].filter(Boolean).join(' · ')}</p>}
          <p className="mt-5 text-muted-foreground">Conecta con tu taller de confianza. Regístrate una vez y tu ficha de cliente quedará asociada a este taller.</p>
        </div>
        <div className="p-7 sm:p-9">
          <EnrollmentForm workshop={data} email={auth.data.user?.email_confirmed_at ? auth.data.user.email || null : null} authError={!!query.auth_error} />
        </div>
      </section>
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Solo tú verificas tu correo. El QR no permite consultar historias de servicio ni da acceso a la administración del taller.</p>
    </main>
  );
}

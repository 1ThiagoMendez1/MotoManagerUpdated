import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyTrialReview } from '@/lib/trial-review-server';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function TrialReviewPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const review = await getMyTrialReview();
  if (!review) redirect('/dashboard');
  return (
    <section className="mx-auto w-full max-w-xl px-5 py-12">
      <div className="rounded-3xl border border-amber-500/25 bg-card p-6 shadow-xl sm:p-9">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldCheck className="h-7 w-7" /></div>
        <p className="text-sm font-semibold text-primary">MotoManager · Verificación del taller</p>
        <h1 className="mt-2 text-2xl font-bold">Prueba gratuita en revisión</h1>
        <p className="mt-2 font-medium text-muted-foreground">{review.workshopName}</p>
        <p className="mt-5 whitespace-pre-wrap leading-relaxed">{review.message}</p>
        <div className="mt-6 rounded-xl bg-muted/60 p-4 text-sm">
          <p className="font-semibold">Ten a mano estos datos para la revisión:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Nombre real, ciudad y dirección del taller.</li>
            <li>Nombre y celular del responsable.</li>
            <li>Ubicación y una foto o evidencia que permita comprobar la actividad del taller.</li>
          </ul>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">Contacta al asesor de MotoManager con quien te registraste. Tus datos se conservan y los días pendientes de prueba se retomarán al aprobar la revisión.</p>
        <form action="/auth/signout" method="post" className="mt-6">
          <Button type="submit" variant="outline" className="w-full">Cerrar sesión</Button>
        </form>
      </div>
    </section>
  );
}

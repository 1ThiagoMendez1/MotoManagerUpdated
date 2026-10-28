'use client';

import { Button } from '@/components/ui/button';

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="mx-auto my-12 max-w-lg space-y-4 rounded-2xl border bg-card p-7 text-center">
    <h2 className="text-xl font-semibold">No pudimos cargar este apartado</h2>
    <p className="text-sm text-muted-foreground">Intenta de nuevo en un momento. Si el problema continúa, contacta con soporte.</p>
    <Button onClick={reset}>Volver a intentar</Button>
  </div>;
}

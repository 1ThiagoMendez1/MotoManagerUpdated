export default function Loading() {
  return <div role="status" aria-live="polite" aria-label="Cargando apartado" className="w-full space-y-5 py-3">
    <div className="h-1 overflow-hidden rounded-full bg-primary/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" /></div>
    <div className="space-y-2"><div className="h-7 w-48 animate-pulse rounded-lg bg-muted" /><div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" /></div>
    <div className="rounded-2xl border bg-card p-5"><div className="mb-5 h-9 w-full animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="flex gap-4 border-t py-4"><div className="h-4 w-1/5 animate-pulse rounded bg-muted" /><div className="h-4 flex-1 animate-pulse rounded bg-muted" /><div className="h-4 w-1/6 animate-pulse rounded bg-muted" /></div>)}
    </div>
    <span className="sr-only">Cargando la información del taller…</span>
  </div>;
}

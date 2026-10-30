'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2, Bike, Phone } from 'lucide-react';
import { confirmCustomerMotorcycle } from '@/lib/actions/customer-intake';

export type IntakeRequest = {
  id: string; customerName: string; phone: string | null; email: string | null;
  plate: string | null; brand: string | null; model: string | null; createdAt: string;
};

function RequestCard({ item }: { item: IntakeRequest }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget); data.set('requestId', item.id);
    try {
      const result = await confirmCustomerMotorcycle(data);
      if (result.error) setError(result.error);
      else setDone(true);
    } catch { setError('La conexión falló. Revisa si la moto se creó antes de reintentar.'); }
    finally { setBusy(false); }
  }
  return <article className="rounded-2xl border bg-card p-5 shadow-sm">
    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Nuevo desde QR</span>
    <h2 className="mt-3 text-xl font-bold">{item.customerName}</h2>
    <p className="text-sm text-muted-foreground">{item.email || 'Cuenta verificada'}</p>
    {item.phone && <a className="mt-2 inline-flex items-center gap-2 text-sm text-primary" href={`tel:${item.phone.replace(/[^+\d]/g, '')}`}><Phone className="h-4 w-4" />{item.phone}</a>}
    <div className="my-4 rounded-xl bg-muted/40 p-3">
      <p className="flex items-center gap-2 font-semibold"><Bike className="h-4 w-4" />{item.plate || 'Placa pendiente'}</p>
      <p className="text-sm text-muted-foreground">{[item.brand,item.model].filter(Boolean).join(' · ') || 'Datos de moto pendientes de confirmar'}</p>
      <p className="mt-2 text-xs text-muted-foreground">Solicitud: {new Date(item.createdAt).toLocaleDateString('es-CO')}</p>
    </div>
    {done ? <div role="status" className="space-y-3 rounded-xl border border-primary/30 p-4">
      <p className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="h-5 w-5" />Moto vinculada al cliente</p>
      <Button asChild className="w-full"><Link href="/motorcycles">Ir a recepción</Link></Button>
    </div> : <form onSubmit={confirm} className="space-y-3">
      <p className="text-sm font-semibold">Recibir motocicleta</p>
      <p className="text-xs text-muted-foreground">Confirma la placa con el cliente. La aplicación no reasignará motos que ya pertenezcan a otra ficha.</p>
      <label className="block text-sm font-medium">Placa<Input name="plate" defaultValue={item.plate || ''} maxLength={12} required placeholder="ABC12D" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Marca<Input name="brand" defaultValue={item.brand || ''} maxLength={60} required placeholder="Yamaha" /></label>
        <label className="text-sm font-medium">Modelo<Input name="model" defaultValue={item.model || ''} maxLength={60} required placeholder="FZ 2.0" /></label>
      </div>
      <label className="block text-sm font-medium">Año<Input name="year" type="number" min={1900} max={new Date().getFullYear()+1} defaultValue={new Date().getFullYear()} required /></label>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{busy ? 'Confirmando...' : 'Confirmar e ingresar moto'}</Button>
    </form>}
  </article>;
}

export default function IntakeCards({ requests }: { requests: IntakeRequest[] }) {
  return requests.length ? <div className="grid gap-4 md:grid-cols-2">{requests.map(item => <RequestCard key={item.id} item={item} />)}</div>
    : <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 text-xl font-semibold">Recepción al día</h2>
      <p className="mt-2 text-muted-foreground">Los clientes que se registren con tu QR aparecerán aquí automáticamente.</p>
      <Button asChild variant="outline" className="mt-5"><Link href="/dashboard/profile">Ver mi QR</Link></Button>
    </div>;
}

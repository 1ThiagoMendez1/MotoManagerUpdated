'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { CheckCircle2, Loader2, MessageCircle, PauseCircle, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MessagePreview } from '@/lib/whatsapp-coexistence/core';

type Snapshot = { allowed: boolean; connection: { number: string; name: string; status: string; templates: Record<string, string>; history: string; progress: number; issue: string | null } | null;
  sdk: { appId: string; configId: string; version: string; onboardingUrl: string } | null; messages: MessagePreview[] };
type FacebookSDK = { init: (options: object) => void; login: (callback: (response: { authResponse?: { code?: string } }) => void, options: object) => void };
const sdk = () => (window as Window & { FB?: FacebookSDK }).FB;
const labels: Record<string, string> = { setting_up: 'Preparando conexión', syncing: 'Sincronizando WhatsApp', pending_templates: 'Esperando aprobación de mensajes', active: 'Conectado', reconnect_required: 'Necesita reconectarse', paused: 'Envíos pausados' };
const templateLabels: Record<string, string> = { order: 'Órdenes de trabajo', quote: 'Cotizaciones', receipt: 'Comprobantes de pago', appointment: 'Citas', reminder: 'Recordatorios de mantenimiento' };
async function api(action: string, data: object = {}) {
  const response = await fetch('/api/whatsapp/connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la conexión.');
  return result;
}
export default function WhatsAppConnection() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [sdkReady, setSdkReady] = useState(false), [prepared, setPrepared] = useState(false);
  const attempt = useRef<{ state: string; code?: string; wabaId?: string; phoneId?: string; sent?: boolean } | null>(null);
  const mounted = useRef(true);
  const [olderAvailable, setOlderAvailable] = useState(true);
  const load = useCallback(async () => {
    const response = await fetch('/api/whatsapp/connection?messages=1', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo consultar WhatsApp.');
    if (mounted.current) setSnapshot(result);
    return result as Snapshot;
  }, []);
  const prepare = useCallback(async () => {
    setPrepared(false);
    const result = await api('begin');
    attempt.current = { state: result.state };
    if (mounted.current) setPrepared(true);
  }, []);
  useEffect(() => {
    mounted.current = true;
    load().then(result => result.allowed && result.sdk && new URL(result.sdk.onboardingUrl).origin === window.location.origin ? prepare() : undefined).catch(e => setError(e.message)).finally(() => setLoading(false));
    return () => { mounted.current = false; };
  }, [load, prepare]);
  const initialize = useCallback(() => {
    if (!snapshot?.sdk || !sdk()) return;
    sdk()!.init({ appId: snapshot.sdk.appId, version: snapshot.sdk.version, autoLogAppEvents: false, xfbml: false });
    setSdkReady(true);
  }, [snapshot?.sdk]);
  useEffect(() => { if (sdk()) initialize(); }, [initialize]);
  const finish = useCallback(async () => {
    const current = attempt.current;
    if (!current?.code || !current.wabaId || current.sent) return;
    current.sent = true; setPrepared(false);
    try {
      await api('complete', { state: current.state, code: current.code, wabaId: current.wabaId, ...(current.phoneId ? { phoneId: current.phoneId } : {}) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la conexión.'); }
    finally { attempt.current = null; setBusy(false); }
  }, [load]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com', 'https://business.facebook.com'].includes(event.origin) || !attempt.current || !busy) return;
      let payload: any;
      try { payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (payload.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' && /^\d{5,30}$/.test(payload.data?.waba_id || '')) {
        attempt.current.wabaId = payload.data.waba_id;
        if (/^\d{5,30}$/.test(payload.data?.phone_number_id || '')) attempt.current.phoneId = payload.data.phone_number_id;
        void finish();
      } else if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
        attempt.current = null; setPrepared(false); setBusy(false); setError('La conexión no se completó. Puedes intentarlo nuevamente.');
      } else if (payload.event === 'FINISH' || payload.event === 'FINISH_ONLY_WABA') {
        attempt.current = null; setPrepared(false); setBusy(false); setError('Elige conectar tu WhatsApp Business actual para conservar el uso en tu celular.');
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [busy, finish]);
  // Poll only during onboarding, so approvals and history completion appear without a page reload.
  useEffect(() => {
    if (!snapshot?.connection || !['setting_up', 'syncing', 'pending_templates'].includes(snapshot.connection.status)) return;
    const timer = setInterval(() => {
      void (snapshot.connection?.status === 'pending_templates' ? api('refresh').then(load) : load()).catch(() => {});
    }, snapshot.connection.status === 'pending_templates' ? 60000 : 15000);
    return () => clearInterval(timer);
  }, [snapshot?.connection?.status, load]);
  const connect = () => {
    if (!sdk() || !snapshot?.sdk || !attempt.current) return;
    setError(''); setBusy(true);
    sdk()!.login(response => {
      if (response.authResponse?.code && attempt.current) { attempt.current.code = response.authResponse.code; void finish(); }
      else { setBusy(false); setPrepared(false); attempt.current = null; setError('Meta no entregó la autorización. Completa el flujo con el botón Finalizar para conectar tu número.'); }
    }, { config_id: snapshot.sdk.configId, response_type: 'code', override_default_response_type: true,
      extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding' } });
  };
  const refresh = async () => {
    setError(''); setBusy(true);
    try { await api('refresh'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); } finally { setBusy(false); }
  };
  const pause = async () => {
    setError(''); setBusy(true);
    try { await api('pause'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo pausar.'); } finally { setBusy(false); }
  };
  const older = async () => {
    const last = snapshot?.messages[snapshot.messages.length - 1];
    if (!last) return;
    setBusy(true); setError('');
    try {
      const query = new URLSearchParams({ messages: '1', before: last.timestamp, beforeId: last.id });
      const result = await fetch('/api/whatsapp/connection?' + query, { cache: 'no-store' });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'No se pudo cargar el historial.');
      setOlderAvailable(data.messages.length === 50);
      setSnapshot(current => current ? { ...current, messages: [...current.messages, ...data.messages.filter((m: MessagePreview) => !current.messages.some(existing => existing.id === m.id))] } : current);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); } finally { setBusy(false); }
  };
  const connection = snapshot?.connection;
  const canonicalPage = Boolean(snapshot?.sdk && typeof window !== 'undefined' && new URL(snapshot.sdk.onboardingUrl).origin === window.location.origin);
  return <main className="mx-auto w-full space-y-6 p-4 md:p-8">
    {snapshot?.allowed && snapshot.sdk && canonicalPage && <Script id="facebook-coexistence-sdk" src="https://connect.facebook.net/es_LA/sdk.js" strategy="afterInteractive" onLoad={initialize} onError={() => setError('No cargó la conexión con Meta. Revisa los bloqueadores de tu navegador y vuelve a intentar.')} />}
    <header className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600"><MessageCircle className="h-7 w-7" /></div><div><h1 className="text-2xl font-bold">WhatsApp de tu taller</h1><p className="text-muted-foreground">Tus clientes reciben los avisos desde tu propio número.</p></div></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">{error}</div>}
    {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Consultando tu conexión…</p> : <>
      <section className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-3"><span className="inline-flex rounded-full bg-muted px-3 py-1 text-sm font-medium">{connection ? labels[connection.status] || 'Revisando conexión' : 'Conecta tu WhatsApp Business'}</span>
          <h2 className="text-xl font-semibold">{connection ? connection.number : 'El mismo WhatsApp que ya usa tu taller'}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{connection ? connection.name : 'Conecta tu cuenta de WhatsApp Business y continúa atendiendo desde el celular. MotoManager podrá enviar los avisos de tus órdenes, cotizaciones, citas y pagos.'}</p>
          {!snapshot?.allowed && <p className="text-sm text-amber-600 dark:text-amber-400">Estamos preparando la conexión de números propios. Te avisaremos cuando esté disponible para tu taller.</p>}
          {connection && ['syncing', 'setting_up'].includes(connection.status) && <p className="text-sm">Mantén WhatsApp Business abierto mientras sincronizamos. {connection.progress > 0 ? `${connection.progress}% completado.` : ''}</p>}
          {connection?.status === 'pending_templates' && <p className="text-sm">Tu número está autorizado. Los avisos automáticos se habilitan al aprobarse los mensajes y terminar la sincronización.</p>}
          {connection?.status === 'reconnect_required' && <p className="text-sm">Vuelve a autorizar tu número para recuperar los envíos automáticos.</p>}
        </div>
        <div className="flex flex-wrap gap-2 md:max-w-sm">
          {snapshot?.allowed && snapshot.sdk && !canonicalPage && <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700"><a href={snapshot.sdk.onboardingUrl}><Smartphone className="mr-2 h-4 w-4" />Conectar WhatsApp Business</a></Button>}
          {snapshot?.allowed && canonicalPage && (!connection || ['reconnect_required', 'paused'].includes(connection.status)) && <Button onClick={prepared ? connect : () => { setError(''); void prepare().catch(e => setError(e.message)); }} disabled={busy || !sdkReady} className="bg-emerald-600 text-white hover:bg-emerald-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}{busy ? 'Conectando…' : prepared ? 'Conectar WhatsApp Business' : 'Preparar nueva conexión'}</Button>}
          {busy && attempt.current && !attempt.current.sent && <Button variant="ghost" onClick={() => { attempt.current = null; setPrepared(false); setBusy(false); }}>Cerrar conexión</Button>}
          {connection && <Button variant="outline" asChild><a href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noopener noreferrer">Configurar pagos en Meta</a></Button>}
          {connection && snapshot?.allowed && <Button variant="outline" onClick={refresh} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Actualizar estado</Button>}
          {connection && connection.status !== 'paused' && <Button variant="ghost" onClick={pause} disabled={busy}><PauseCircle className="mr-2 h-4 w-4" />Pausar envíos</Button>}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-4 rounded-2xl border bg-card p-6"><h2 className="font-semibold">Así funciona</h2>{['Autoriza tu número con Meta desde este botón.', 'Confirma la conexión en la app WhatsApp Business de tu celular.', 'Continúa atendiendo en el celular y recibe aquí los mensajes de tus clientes.'].map((text, i) => <p key={text} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{i + 1}</span>{text}</p>)}<p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Meta te pedirá los permisos de conexión. Los mensajes automáticos están sujetos a sus tarifas y al método de pago de tu cuenta.</p></section>
      <section className="space-y-4 rounded-2xl border bg-card p-6"><h2 className="font-semibold">Avisos automáticos</h2>{Object.entries(templateLabels).map(([kind, label]) => <div key={kind} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="flex items-center gap-1 text-muted-foreground">{connection?.templates[kind] === 'APPROVED' ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" />Aprobado</> : connection?.templates[kind] === 'REJECTED' ? 'Requiere revisión' : connection ? 'Pendiente de Meta' : 'Al conectar tu número'}</span></div>)}</section></div>
      {connection && <section className="space-y-4 rounded-2xl border bg-card p-6"><h2 className="font-semibold">Conversaciones recientes</h2>{snapshot.messages.length === 0 ? <p className="text-sm text-muted-foreground">Los mensajes aparecerán aquí cuando Meta entregue la sincronización o tus clientes escriban.</p> : <div className="max-h-[36rem] space-y-3 overflow-auto">{snapshot.messages.map(message => <article key={message.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{message.direction === 'out' ? 'Tu taller → ' : ''}{message.peer}</span><time>{new Date(message.timestamp).toLocaleString('es-CO')}</time></div><p className="mt-2 whitespace-pre-wrap break-words">{message.text}</p></article>)}</div>}{snapshot.messages.length >= 50 && olderAvailable && <Button variant="outline" onClick={older} disabled={busy}>Ver mensajes anteriores</Button>}<p className="text-xs text-muted-foreground">{connection.history === 'declined' ? 'Elegiste no compartir el historial anterior. Los mensajes nuevos seguirán apareciendo aquí.' : 'Se muestra el historial que autorizaste compartir con MotoManager y los nuevos mensajes de esta conexión.'}</p></section>}
    </>}
  </main>;
}

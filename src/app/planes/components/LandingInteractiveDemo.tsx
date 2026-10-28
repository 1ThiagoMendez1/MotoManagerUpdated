'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, Bike, Boxes, CalendarDays, Check, CheckCircle2,
  ClipboardList, CreditCard, LayoutGrid, Moon, Plus, RotateCcw, ShoppingBag,
  Sparkles, Sun, Users, Wrench, X,
} from 'lucide-react';

type Screen = 'inicio' | 'dashboard' | 'ordenes' | 'motos' | 'inventario' | 'ventas';
type WorkStatus = 'received' | 'diagnosis' | 'repair' | 'ready' | 'delivered';
type WorkOrder = { id: number; plate: string; customer: string; bike: string; service: string; status: WorkStatus; total: number };
type StockItem = { id: number; name: string; sku: string; units: number; price: number };
const START_ORDERS: WorkOrder[] = [
  { id: 1042, plate: 'DEMO-01', customer: 'Laura Gómez', bike: 'Yamaha FZ 2.0', service: 'Diagnóstico general', status: 'diagnosis', total: 125000 },
  { id: 1041, plate: 'DEMO-02', customer: 'Andrés Rojas', bike: 'Honda CB 125F', service: 'Cambio de pastillas', status: 'repair', total: 178000 },
  { id: 1040, plate: 'DEMO-03', customer: 'Natalia Ruiz', bike: 'AKT NKD 125', service: 'Mantenimiento preventivo', status: 'delivered', total: 95000 },
];
const START_STOCK: StockItem[] = [
  { id: 1, name: 'Aceite 4T 10W40', sku: 'ACE-1040', units: 12, price: 38000 },
  { id: 2, name: 'Pastillas de freno', sku: 'FRE-210', units: 3, price: 48000 },
  { id: 3, name: 'Filtro de aire', sku: 'FIL-110', units: 7, price: 24500 },
];
const BIKES = [
  { plate: 'DEMO-01', name: 'Yamaha FZ 2.0', owner: 'Laura Gómez', year: 2023 },
  { plate: 'DEMO-02', name: 'Honda CB 125F', owner: 'Andrés Rojas', year: 2022 },
  { plate: 'DEMO-03', name: 'AKT NKD 125', owner: 'Natalia Ruiz', year: 2024 },
  { plate: 'DEMO-04', name: 'Bajaj Pulsar NS 200', owner: 'Carlos Medina', year: 2021 },
];
const NEXT: Record<WorkStatus, WorkStatus> = {
  received: 'diagnosis', diagnosis: 'repair', repair: 'ready', ready: 'delivered', delivered: 'delivered',
};
const STATUS: Record<WorkStatus, string> = {
  received: 'Recibida', diagnosis: 'Diagnosticando', repair: 'Reparando',
  ready: 'Lista para entrega', delivered: 'Entregada',
};
const NAV: { id: Screen; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutGrid },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ordenes', label: 'Órdenes', icon: ClipboardList },
  { id: 'motos', label: 'Motocicletas', icon: Bike },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'ventas', label: 'Ventas', icon: ShoppingBag },
];
const money = (value: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(value);

export function LandingInteractiveDemo() {
  const [screen, setScreen] = useState<Screen>('inicio');
  const [dark, setDark] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>(START_ORDERS);
  const [stock, setStock] = useState<StockItem[]>(START_STOCK);
  const [extraSales, setExtraSales] = useState(0);
  const [orderModal, setOrderModal] = useState(false);
  const [plate, setPlate] = useState('DEMO-04');
  const [message, setMessage] = useState('');
  const activeOrders = orders.filter(order => order.status !== 'delivered');
  const busyPlates = new Set(activeOrders.map(order => order.plate));
  const availableBikes = BIKES.filter(bike => !busyPlates.has(bike.plate));
  const revenue = useMemo(() => orders.filter(o => o.status === 'delivered')
    .reduce((sum, order) => sum + order.total, 0) + extraSales * 38000, [orders, extraSales]);
  const active = (value: Screen) => {
    setScreen(value);
    setMessage('');
  };
  const progress = (id: number) => {
    setOrders(current => current.map(item => item.id === id ? { ...item, status: NEXT[item.status] } : item));
    setMessage('Estado actualizado en la demostración. Ningún cliente real recibió mensajes.');
  };
  const openNewOrder = () => {
    setPlate(availableBikes[0]?.plate ?? '');
    setOrderModal(true);
  };
  const createOrder = () => {
    const bike = BIKES.find(item => item.plate === plate);
    if (!bike || busyPlates.has(plate)) {
      setMessage('Esta motocicleta ya tiene una orden activa. Prueba otra.');
      return;
    }
    setOrders(current => [{
      id: Math.max(...current.map(order => order.id), 1042) + 1,
      plate: bike.plate, customer: bike.owner, bike: bike.name,
      service: 'Revisión de ingreso', status: 'received', total: 0,
    }, ...current]);
    setOrderModal(false);
    setScreen('ordenes');
    setMessage('¡Orden de ejemplo creada! Ahora puedes avanzar sus etapas.');
  };
  const addStock = (id: number) => {
    setStock(items => items.map(item => item.id === id ? { ...item, units: item.units + 5 } : item));
    setMessage('Reposición simulada: +5 unidades. No se modificó ningún inventario real.');
  };
  const makeSale = () => {
    const item = stock.find(i => i.id === 1);
    if (!item || item.units <= 0) {
      setMessage('En la demo no quedan unidades para vender.');
      return;
    }
    setStock(items => items.map(i => i.id === 1 ? { ...i, units: i.units - 1 } : i));
    setExtraSales(count => count + 1);
    setMessage('Venta ficticia registrada. Se descontó una unidad del inventario de ejemplo.');
  };
  const reset = () => {
    setOrders(START_ORDERS);
    setStock(START_STOCK);
    setExtraSales(0);
    setScreen('inicio');
    setMessage('Demo restablecida. Tus cambios nunca se guardan.');
    setOrderModal(false);
    setPlate('DEMO-04');
  };
  const card = 'rounded-2xl border p-5 shadow-sm ' + (dark ? 'border-white/10 bg-[#141d2d]' : 'border-[#d8e1ea] bg-white');
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const accent = 'bg-[#347df1] text-white hover:bg-[#2367dd]';
  const secondary = dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200';
  const pill = (status: WorkStatus) => status === 'delivered'
    ? (dark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
    : status === 'ready'
      ? (dark ? 'bg-orange-400/15 text-orange-200' : 'bg-orange-50 text-orange-700')
      : (dark ? 'bg-blue-400/15 text-blue-200' : 'bg-blue-50 text-blue-700');

  return (
    <section id="demo" className="scroll-mt-20 bg-[#071224] px-4 py-20 text-white sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#fd821b]/40 bg-[#fd821b]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[#ffad69]">
            <Sparkles className="h-3.5 w-3.5" /> No te lo imagines. Pruébalo.
          </span>
          <h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Entra al taller. <span className="text-[#ff8a28]">Sin registrarte.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Esta es una demostración interactiva inspirada en la interfaz de MotoManager.
            Cambia de módulo, crea una orden ficticia, actualiza su estado y simula una venta.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-400">
            <span><Check className="mr-1 inline h-4 w-4 text-emerald-400" /> Sin correo</span>
            <span><Check className="mr-1 inline h-4 w-4 text-emerald-400" /> Sin tarjeta</span>
            <span><Check className="mr-1 inline h-4 w-4 text-emerald-400" /> Datos 100% ficticios</span>
          </div>
        </div>

        <div className="mt-11 overflow-hidden rounded-[26px] border border-slate-600/50 bg-[#0b1524] shadow-[0_35px_90px_rgba(0,0,0,.35)] sm:rounded-[30px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b1524] px-4 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#347df1]/30 bg-[#347df1]/15 text-[#ff8a28]"><Wrench className="h-5 w-5" /></span>
              <div className="text-sm font-bold leading-tight">MotoManager
                <span className="block text-[11px] font-medium text-slate-400">Taller Ejemplo · Demo</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#ff8a28]/40 bg-[#ff8a28]/10 px-3 py-1 text-[11px] font-bold text-[#ffbd8a]">MODO DEMOSTRACIÓN</span>
              <button onClick={reset} type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10" aria-label="Reiniciar la demostración">
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
              </button>
              <button onClick={() => setDark(v => !v)} type="button" aria-label={dark ? 'Ver demo en modo claro' : 'Ver demo en modo oscuro'} className="rounded-lg border border-white/15 p-2 text-slate-200 hover:bg-white/10">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className={'transition-colors duration-300 ' + (dark ? 'bg-[#060c18] text-white' : 'bg-[#edf3f8] text-[#122036]')}>
            <div className={'flex gap-1 overflow-x-auto border-b px-3 py-3 sm:justify-center sm:px-6 ' + (dark ? 'border-white/10' : 'border-slate-200')}>
              {NAV.map(item => {
                const Icon = item.icon;
                return <button
                  key={item.id} type="button" onClick={() => active(item.id)}
                  aria-pressed={screen === item.id}
                  className={'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ' +
                    (screen === item.id ? accent : (dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white'))}>
                  <Icon className="h-4 w-4" /> {item.label}
                </button>;
              })}
            </div>

            <div className="mx-auto min-h-[490px] max-w-6xl p-4 sm:p-6 lg:p-8">
              {message && <p role="status" aria-live="polite" className={'mb-5 rounded-xl border px-4 py-3 text-sm ' +
                (dark ? 'border-blue-400/30 bg-blue-400/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800')}>{message}</p>}

              {screen === 'inicio' && <>
                <div className="mb-6">
                  <span className={'text-xs font-semibold uppercase tracking-widest ' + muted}>Vista de inicio · Taller Ejemplo</span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Buenas tardes, equipo.</h3>
                  <p className={'mt-1 text-sm ' + muted}>Tu taller de demostración, bajo control.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                  <div className={card + ' bg-gradient-to-br ' + (dark ? 'from-[#182943] to-[#111b29]' : 'from-[#f4f8fc] to-[#dfeafb]')}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#347df1] text-white"><ClipboardList className="h-5 w-5" /></span>
                    <h4 className="mt-3 text-xl font-bold">Órdenes de Trabajo</h4>
                    <p className={'mt-2 text-sm ' + muted}>Gestiona reparaciones, diagnósticos y entregas.</p>
                    <div className="mt-7 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={openNewOrder} className={'rounded-xl px-4 py-3 text-sm font-bold ' + accent}><Plus className="mr-1 inline h-4 w-4" /> Nueva orden</button>
                      <button type="button" onClick={() => active('ordenes')} className={'rounded-xl px-4 py-3 text-sm font-bold ' + secondary}>Ver todas <ArrowRight className="ml-1 inline h-4 w-4" /></button>
                    </div>
                  </div>
                  <button type="button" onClick={() => active('dashboard')} className={card + ' text-left transition hover:-translate-y-0.5'}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white"><BarChart3 className="h-5 w-5" /></span>
                    <h4 className="mt-3 text-lg font-bold">Dashboard</h4>
                    <p className={'mt-5 text-sm ' + muted}>Una visión del trabajo y las ventas de ejemplo.</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#347df1]">Explorar <ArrowRight className="h-4 w-4" /></span>
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    ['motos', 'Motocicletas', Bike, 'text-[#ff7c0d] bg-[#ff7c0d]/10'],
                    ['inventario', 'Inventario', Boxes, 'text-amber-500 bg-amber-500/10'],
                    ['ventas', 'Ventas', ShoppingBag, 'text-emerald-500 bg-emerald-500/10'],
                    ['ordenes', 'Servicios', Wrench, 'text-fuchsia-500 bg-fuchsia-500/10'],
                  ] as const).map(([target, name, Icon, tint]) => (
                    <button type="button" key={name} onClick={() => active(target)} className={card + ' text-left transition hover:-translate-y-0.5'}>
                      <span className={'inline-flex h-9 w-9 items-center justify-center rounded-xl ' + tint}><Icon className="h-5 w-5" /></span>
                      <span className="mt-5 block text-sm font-bold">{name}</span>
                      <span className={'mt-1 block text-xs ' + muted}>Abrir módulo</span>
                    </button>
                  ))}
                </div>
              </>}

              {screen === 'dashboard' && <>
                <Header title="Dashboard general" subtitle="Indicadores calculados con los datos ficticios de esta demostración." />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: 'Ventas de ejemplo', value: money(revenue), icon: CreditCard },
                    { label: 'Órdenes abiertas', value: String(activeOrders.length), icon: ClipboardList },
                    { label: 'Motos registradas', value: String(BIKES.length), icon: Bike },
                    { label: 'Repuestos bajo stock', value: String(stock.filter(s => s.units <= 3).length), icon: Boxes },
                  ].map(item => <div className={card} key={item.label}>
                    <item.icon className="h-5 w-5 text-[#347df1]" />
                    <p className={'mt-4 text-xs ' + muted}>{item.label}</p>
                    <p className="mt-1 text-lg font-extrabold sm:text-2xl">{item.value}</p>
                  </div>)}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className={card}>
                    <h4 className="font-bold">Estado de órdenes</h4>
                    <div className="mt-5 space-y-4">
                      {(['received', 'diagnosis', 'repair', 'ready', 'delivered'] as WorkStatus[]).map(status => {
                        const count = orders.filter(o => o.status === status).length;
                        return <div key={status} className="flex items-center gap-3 text-sm">
                          <span className="w-36 shrink-0">{STATUS[status]}</span>
                          <div className={'h-2 flex-1 overflow-hidden rounded-full ' + (dark ? 'bg-white/10' : 'bg-slate-100')}>
                            <div className="h-full rounded-full bg-[#347df1] transition-all" style={{ width: (count / Math.max(orders.length, 1) * 100) + '%' }} />
                          </div><strong>{count}</strong>
                        </div>;
                      })}
                    </div>
                  </div>
                  <div className={card}>
                    <h4 className="font-bold">Movimientos de ejemplo</h4>
                    <p className={'mt-2 text-sm leading-6 ' + muted}>Crea una orden, avanza su estado o simula una venta y vuelve aquí para ver cómo cambian los indicadores.</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button type="button" className={'rounded-lg px-4 py-2 text-sm font-bold ' + accent} onClick={() => active('ordenes')}>Gestionar órdenes</button>
                      <button type="button" className={'rounded-lg px-4 py-2 text-sm font-bold ' + secondary} onClick={() => active('ventas')}>Simular venta</button>
                    </div>
                  </div>
                </div>
              </>}

              {screen === 'ordenes' && <>
                <Header title="Órdenes de Trabajo" subtitle="Avanza una orden para ver cómo cambia el seguimiento. No se envía nada a WhatsApp." />
                <button type="button" onClick={openNewOrder} className={'mb-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ' + accent}><Plus className="h-4 w-4" /> Nueva orden ficticia</button>
                <div className={card + ' overflow-x-auto'}>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className={'border-b text-xs uppercase tracking-wide ' + (dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500')}>
                      <tr><th className="pb-4">Orden</th><th className="pb-4">Motocicleta / cliente</th><th className="pb-4">Estado</th><th className="pb-4 text-right">Acción</th></tr>
                    </thead>
                    <tbody>
                      {orders.map(order => <tr key={order.id} className={'border-b last:border-0 ' + (dark ? 'border-white/10' : 'border-slate-100')}>
                        <td className="py-4 font-bold">#{order.id}<span className={'mt-1 block text-xs font-normal ' + muted}>{order.service}</span></td>
                        <td className="py-4"><strong className="block">{order.plate} · {order.bike}</strong><span className={'text-xs ' + muted}>{order.customer}</span></td>
                        <td className="py-4"><span className={'inline-flex rounded-full px-3 py-1 text-xs font-bold ' + pill(order.status)}>{STATUS[order.status]}</span></td>
                        <td className="py-4 text-right">{order.status !== 'delivered'
                          ? <button type="button" onClick={() => progress(order.id)} className="rounded-lg border border-[#347df1]/40 px-3 py-2 text-xs font-bold text-[#347df1] hover:bg-[#347df1]/10">Siguiente etapa <ArrowRight className="inline h-3 w-3" /></button>
                          : <span className="inline-flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Cerrada</span>}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              </>}

              {screen === 'motos' && <>
                <Header title="Motocicletas registradas" subtitle="Cada motocicleta conserva su historial, incluso después de entregar una orden." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {BIKES.map(bike => {
                    const current = orders.find(o => o.plate === bike.plate && o.status !== 'delivered') || orders.find(o => o.plate === bike.plate);
                    return <div key={bike.plate} className={card + ' flex items-start gap-3'}>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff7c0d]/10 text-[#ff7c0d]"><Bike className="h-6 w-6" /></span>
                      <div className="min-w-0"><p className="font-extrabold">{bike.plate}</p><p className="mt-1 text-sm">{bike.name} · {bike.year}</p><p className={'mt-1 text-xs ' + muted}>{bike.owner}</p>
                        <p className="mt-3 text-xs font-semibold text-[#347df1]">{current ? 'Última orden: ' + STATUS[current.status] : 'Sin órdenes registradas'}</p>
                      </div>
                    </div>;
                  })}
                </div>
              </>}

              {screen === 'inventario' && <>
                <Header title="Inventario y repuestos" subtitle="Prueba reponer existencias: las cantidades cambian únicamente dentro de esta página." />
                <div className="grid gap-3 md:grid-cols-3">
                  {stock.map(item => <div key={item.id} className={card}>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Boxes className="h-5 w-5" /></span>
                    <p className={'mt-4 text-xs ' + muted}>{item.sku}</p><h4 className="mt-1 text-base font-bold">{item.name}</h4>
                    <p className={'mt-2 text-sm ' + muted}>Precio de ejemplo: {money(item.price)}</p>
                    <p className="mt-5 text-2xl font-extrabold">{item.units}<span className={'ml-2 text-sm font-normal ' + muted}>unidades</span></p>
                    {item.units <= 3 && <p className="mt-1 text-xs font-bold text-orange-500">Stock bajo</p>}
                    <button type="button" onClick={() => addStock(item.id)} className={'mt-4 w-full rounded-lg px-3 py-2 text-sm font-bold ' + secondary}>+ Simular reposición</button>
                  </div>)}
                </div>
              </>}

              {screen === 'ventas' && <>
                <Header title="Ventas y caja" subtitle="Simula vender un aceite y comprueba cómo se descuenta del inventario de demostración." />
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={card}>
                    <p className={'text-sm ' + muted}>Producto de ejemplo</p><h4 className="mt-2 text-xl font-bold">Aceite 4T 10W40</h4>
                    <p className="mt-2 text-3xl font-extrabold">{money(38000)}</p>
                    <p className={'mt-1 text-xs ' + muted}>Disponibles: {stock.find(i => i.id === 1)?.units ?? 0} unidades</p>
                    <button type="button" onClick={makeSale} disabled={!stock.find(i => i.id === 1)?.units} className={'mt-8 w-full rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ' + accent}>
                      <ShoppingBag className="mr-2 inline h-4 w-4" /> Simular venta de 1 unidad
                    </button>
                  </div>
                  <div className={card}>
                    <p className={'text-sm ' + muted}>Resumen de esta demostración</p>
                    <p className="mt-4 text-4xl font-extrabold">{money(extraSales * 38000)}</p>
                    <p className={'mt-2 text-sm ' + muted}>{extraSales} ventas ficticias registradas en esta visita</p>
                    <div className={'mt-6 border-t pt-5 text-sm leading-7 ' + (dark ? 'border-white/10' : 'border-slate-100')}>No se registran pagos ni se envía información a ningún servidor.</div>
                  </div>
                </div>
              </>}
            </div>
            <div className={'flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 text-xs sm:px-8 ' + (dark ? 'border-white/10 bg-[#0b1424] text-slate-400' : 'border-slate-200 bg-white text-slate-500')}>
              <span>● Taller Ejemplo · Información ficticia · Cambios solo en tu navegador</span>
              <span className="font-semibold text-[#347df1]">MotoManager · Demo comercial</span>
            </div>
          </div>
        </div>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href="#planes" className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#ff831b] px-7 py-4 text-center text-sm font-extrabold text-[#091426] transition hover:bg-[#ffa14f] sm:w-auto">
            Quiero MotoManager para mi taller <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-center text-sm text-slate-400">¿Te convenció? Compara los planes y elige el adecuado.</p>
        </div>
      </div>

      {orderModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#030817]/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOrderModal(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-[#122036] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="demo-new-order-title">
            <div className="flex items-start justify-between gap-3">
              <div><h3 id="demo-new-order-title" className="text-xl font-extrabold">Nueva orden de ejemplo</h3>
                <p className="mt-2 text-sm text-slate-500">Simula el ingreso de una moto. No guarda información real.</p></div>
              <button type="button" onClick={() => setOrderModal(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Cerrar diálogo de nueva orden"><X className="h-5 w-5" /></button>
            </div>
            <label htmlFor="demo-motorcycle" className="mt-7 block text-sm font-bold">Motocicleta</label>
            <select id="demo-motorcycle" value={plate} onChange={event => setPlate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
              {BIKES.map(bike => <option key={bike.plate} value={bike.plate} disabled={busyPlates.has(bike.plate)}>{bike.plate} · {bike.name}{busyPlates.has(bike.plate) ? ' (orden activa)' : ''}</option>)}
            </select>
            <label htmlFor="demo-service" className="mt-5 block text-sm font-bold">Servicio de ejemplo</label>
            <input id="demo-service" value="Revisión de ingreso" readOnly className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600" />
            <p className="mt-3 text-xs text-slate-500">Las motos con una orden activa no pueden duplicarla. Las entregadas pueden regresar.</p>
            <button type="button" onClick={createOrder} disabled={!availableBikes.length || busyPlates.has(plate)} className={'mt-7 w-full rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ' + accent}>
              Crear orden ficticia
            </button>
            {!availableBikes.length && <p className="mt-3 text-sm text-orange-700">Todas tienen órdenes activas. Avanza una hasta entregarla.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-6">
    <span className="text-xs font-bold uppercase tracking-widest text-[#347df1]">MotoManager / Demo</span>
    <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
    <p className="mt-2 text-sm leading-6 opacity-70">{subtitle}</p>
  </div>;
}

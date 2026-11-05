'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight, BadgeCheck, Bike, CalendarDays, CheckCircle2, ClipboardList, CreditCard,
  FileText, Headphones, MessageCircle, Plus, ShieldCheck, UserRound, Users, Wallet, Wrench,
} from 'lucide-react';

export type ExtraScreen = 'clientes' | 'servicios' | 'citas' | 'contabilidad' | 'tecnicos' |
  'permisos' | 'soporte' | 'portal' | 'whatsapp';
type DemoOrder = { id: number; plate: string; customer: string; bike: string; service: string; status: string; total: number; technician?: string };
type DemoBike = { plate: string; name: string; owner: string; year: number };
type Appointment = { id: number; plate: string; date: string; time: string; status: 'Pendiente' | 'Confirmada' | 'Completada' | 'Cancelada' };
type Ticket = { id: number; title: string; status: 'Pendiente' | 'En Revisión' | 'Finalizado' };
const CATALOG = [
  { id: 'aceite', name: 'Cambio de aceite', category: 'Mantenimiento', price: 38000, minutes: 30 },
  { id: 'frenos', name: 'Revisión de frenos', category: 'Seguridad', price: 55000, minutes: 45 },
  { id: 'diagnostico', name: 'Diagnóstico general', category: 'Diagnóstico', price: 65000, minutes: 50 },
  { id: 'cadena', name: 'Ajuste y lubricación de cadena', category: 'Mantenimiento', price: 28000, minutes: 25 },
];
const TECHNICIANS = ['Técnico de ejemplo A', 'Técnico de ejemplo B', 'Técnico de ejemplo C'];
const ROLE_MODULES = [
  'Dashboard', 'Órdenes de Trabajo', 'Clientes', 'Motocicletas', 'Inventario',
  'Servicios', 'Ventas', 'Citas', 'Contabilidad', 'Técnicos', 'Usuarios y permisos', 'Soporte',
];
const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 21, plate: 'DEMO-01', date: '2026-11-02', time: '09:00', status: 'Confirmada' },
  { id: 22, plate: 'DEMO-03', date: '2026-11-03', time: '14:00', status: 'Pendiente' },
];
const INITIAL_TICKETS: Ticket[] = [{ id: 501, title: 'Consulta sobre reportes', status: 'En Revisión' }];
const format = (n: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(n);
const buttonClass = 'rounded-xl bg-[#347df1] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2769d2] disabled:cursor-not-allowed disabled:opacity-40';
const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#347df1]';
const initialClients = ['Laura Gómez', 'Andrés Rojas', 'Natalia Ruiz', 'Carlos Medina'];

export function LandingDemoExtras({
  screen, dark, orders, bikes, revenue, resetVersion, onNavigate, onAssignTechnician,
}: {
  screen: string; dark: boolean; orders: DemoOrder[]; bikes: DemoBike[]; revenue: number;
  resetVersion: number; onNavigate: (screen: string) => void;
  onAssignTechnician: (id: number, name: string) => void;
}) {
  const [clients, setClients] = useState(initialClients);
  const [clientSearch, setClientSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>(['diagnostico']);
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [apptPlate, setApptPlate] = useState('DEMO-04');
  const [apptDate, setApptDate] = useState('2026-11-05');
  const [expense, setExpense] = useState(0);
  const [expenseName, setExpenseName] = useState('Compra de insumos');
  const [expenses, setExpenses] = useState<{ name: string; total: number }[]>([]);
  const [role, setRole] = useState('Técnico');
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [ticketName, setTicketName] = useState('');
  const [portalPlate, setPortalPlate] = useState('DEMO-01');
  const [messageOrder, setMessageOrder] = useState(1042);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setClients(initialClients); setClientSearch(''); setClientName('');
    setSelectedServices(['diagnostico']); setAppointments(INITIAL_APPOINTMENTS);
    setApptPlate('DEMO-04'); setApptDate('2026-11-05'); setExpense(0);
    setExpenseName('Compra de insumos'); setExpenses([]); setRole('Técnico');
    setRolePermissions({}); setTickets(INITIAL_TICKETS); setTicketName('');
    setPortalPlate('DEMO-01'); setMessageOrder(1042); setNotice('');
  }, [resetVersion]);

  const totalQuote = useMemo(() => CATALOG.filter(x => selectedServices.includes(x.id))
    .reduce((sum, service) => sum + service.price, 0), [selectedServices]);
  const currentOrder = orders.find(o => o.id === messageOrder) || orders[0];
  const card = 'rounded-2xl border p-5 shadow-sm ' + (dark ? 'border-white/10 bg-[#131f32]' : 'border-[#d7e1ed] bg-white');
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const outline = dark ? 'border-white/10' : 'border-slate-200';
  const heading = (title: string, subtitle: string) => (
    <header className="mb-6">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#347df1]">MotoManager / Demostración</span>
      <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
      <p className={'mt-2 text-sm leading-6 ' + muted}>{subtitle}</p>
    </header>
  );
  const note = (content: string) => (
    <p role="status" aria-live="polite" className={'mt-4 rounded-xl border p-3 text-sm ' + (dark ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-blue-100 bg-blue-50 text-blue-800')}>{content}</p>
  );
  const addClient = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = clientName.trim();
    if (name.length < 3) return;
    if (clients.some(c => c.toLocaleLowerCase('es-CO') === name.toLocaleLowerCase('es-CO'))) {
      setNotice('Ese nombre ya aparece en el directorio de ejemplo.');
      return;
    }
    setClients(items => [...items, name]); setClientName('');
    setNotice('Cliente ficticio creado en el directorio de demostración.');
  };
  const createAppointment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!apptDate) return;
    setAppointments(a => [{ id: Math.max(...a.map(x => x.id), 22) + 1,
      plate: apptPlate, date: apptDate, time: '10:00', status: 'Pendiente' }, ...a]);
    setNotice('Cita ficticia agendada; no se enviaron notificaciones.');
  };
  const createTicket = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ticketName.trim().length < 4) return;
    setTickets(t => [{ id: Math.max(...t.map(x => x.id), 501) + 1, title: ticketName.trim(), status: 'Pendiente' }, ...t]);
    setTicketName(''); setNotice('Solicitud de ejemplo creada. No se abrió ningún ticket real.');
  };
  const addExpense = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!Number.isFinite(expense) || expense <= 0 || expense > 100000000) return;
    setExpenses(items => [...items, { name: expenseName.trim() || 'Gasto', total: expense }]);
    setExpense(0); setNotice('Egreso simulado añadido al resumen financiero.');
  };
  const toggleRole = (module: string) => {
    const key = role + '::' + module;
    setRolePermissions(prev => ({ ...prev, [key]: !(prev[key] ?? (
      role === 'Dueño' || role === 'Administrador' ||
      (role === 'Técnico' && ['Órdenes de Trabajo', 'Inventario', 'Motocicletas'].includes(module)) ||
      (role === 'Recepcionista' && ['Clientes', 'Órdenes de Trabajo', 'Ventas', 'Citas'].includes(module))
    )) }));
    setNotice('Permiso modificado solo en la demostración, no en cuentas reales.');
  };
  const hasRole = (module: string) => {
    const key = role + '::' + module;
    return rolePermissions[key] ?? (
      role === 'Dueño' || role === 'Administrador' ||
      (role === 'Técnico' && ['Órdenes de Trabajo', 'Inventario', 'Motocicletas'].includes(module)) ||
      (role === 'Recepcionista' && ['Clientes', 'Órdenes de Trabajo', 'Ventas', 'Citas'].includes(module))
    );
  };

  if (!['clientes', 'servicios', 'citas', 'contabilidad', 'tecnicos', 'permisos', 'soporte', 'portal', 'whatsapp'].includes(screen)) return null;
  return (
    <div>
      {screen === 'clientes' && <>
        {heading('Directorio de Clientes', 'Búsqueda y registro de clientes, como en el módulo real del taller.')}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <form className={card} onSubmit={addClient}>
            <div className="flex items-center gap-2 font-bold"><UserRound className="h-5 w-5 text-[#347df1]" /> Registrar cliente</div>
            <label htmlFor="demo-client-name" className={'mt-5 block text-xs font-semibold ' + muted}>Nombre completo</label>
            <input id="demo-client-name" value={clientName} minLength={3} maxLength={60} onChange={e => setClientName(e.target.value)}
              placeholder="Ejemplo: Camila Vargas" className={fieldClass + ' mt-2'} required />
            <button type="submit" className={buttonClass + ' mt-4 w-full'}><Plus className="mr-1 inline h-4 w-4" /> Agregar cliente ficticio</button>
            <p className={'mt-3 text-xs leading-5 ' + muted}>El módulo real permite relacionar cada cliente con sus motocicletas e historial.</p>
          </form>
          <div className={card}>
            <div className="flex items-center justify-between gap-3"><h4 className="font-bold">Clientes ({clients.length})</h4><Users className="h-5 w-5 text-[#347df1]" /></div>
            <input aria-label="Buscar clientes de ejemplo" value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              placeholder="Buscar cliente..." className={fieldClass + ' mt-4'} />
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {clients.filter(c => c.toLowerCase().includes(clientSearch.toLowerCase())).map((c, i) =>
                <div key={c} className={'flex items-center gap-3 rounded-xl border px-3 py-3 ' + outline}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#347df1]/10 text-xs font-bold text-[#347df1]">{c.split(' ').slice(0,2).map(x=>x[0]).join('')}</span>
                  <div><p className="text-sm font-semibold">{c}</p><p className={'text-xs ' + muted}>{bikes.filter(b => b.owner === c).length} motocicleta(s)</p></div>
                </div>)}
            </div>
          </div>
        </div>
      </>}

      {screen === 'servicios' && <>
        {heading('Catálogo de Servicios', 'Explora precios de mano de obra y arma una cotización de ejemplo.')}
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {CATALOG.map(item => <button type="button" key={item.id}
              onClick={() => setSelectedServices(a => a.includes(item.id) ? a.filter(id => id !== item.id) : [...a, item.id])}
              aria-pressed={selectedServices.includes(item.id)}
              className={card + ' text-left transition hover:border-[#347df1] ' + (selectedServices.includes(item.id) ? 'ring-2 ring-[#347df1]/55' : '')}>
              <div className="flex items-center justify-between gap-2"><Wrench className="h-5 w-5 text-[#347df1]" /><span className={'text-xs ' + muted}>{item.minutes} min</span></div>
              <p className={'mt-4 text-xs ' + muted}>{item.category}</p><h4 className="mt-1 text-sm font-bold">{item.name}</h4>
              <p className="mt-3 font-extrabold text-[#347df1]">{format(item.price)}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold">{selectedServices.includes(item.id) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4" />} {selectedServices.includes(item.id) ? 'Incluido en cotización' : 'Agregar a cotización'}</span>
            </button>)}
          </div>
          <div className={card + ' self-start'}>
            <div className="flex items-center gap-2 font-bold"><FileText className="h-5 w-5 text-[#347df1]" /> Cotización simulada</div>
            <p className={'mt-3 text-xs ' + muted}>{selectedServices.length} servicio(s) seleccionados</p>
            <div className={'mt-5 space-y-3 border-b pb-5 text-sm ' + outline}>
              {CATALOG.filter(s => selectedServices.includes(s.id)).map(s => <p key={s.id} className="flex justify-between gap-3"><span>{s.name}</span><strong>{format(s.price)}</strong></p>)}
              {!selectedServices.length && <p className={muted}>Selecciona servicios del catálogo.</p>}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest">Subtotal de ejemplo</p>
            <p className="mt-2 text-3xl font-extrabold">{format(totalQuote)}</p>
            <button className={buttonClass + ' mt-5 w-full'} onClick={() => onNavigate('ordenes')} type="button">Ver órdenes de trabajo <ArrowRight className="ml-1 inline h-4 w-4" /></button>
          </div>
        </div>
      </>}

      {screen === 'citas' && <>
        {heading('Citas y Agenda', 'Solicita, confirma y gestiona citas ficticias con estados reales del sistema.')}
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={createAppointment} className={card}>
            <h4 className="flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-[#347df1]" /> Nueva cita</h4>
            <label htmlFor="demo-appt-plate" className={'mt-5 block text-xs font-semibold ' + muted}>Motocicleta</label>
            <select id="demo-appt-plate" className={fieldClass + ' mt-2'} value={apptPlate} onChange={e => setApptPlate(e.target.value)}>
              {bikes.map(b => <option key={b.plate} value={b.plate}>{b.plate} · {b.name}</option>)}
            </select>
            <label htmlFor="demo-appt-date" className={'mt-4 block text-xs font-semibold ' + muted}>Fecha</label>
            <input id="demo-appt-date" type="date" required value={apptDate} onChange={e => setApptDate(e.target.value)} className={fieldClass + ' mt-2'} />
            <button className={buttonClass + ' mt-5 w-full'} type="submit"><Plus className="mr-1 inline h-4 w-4" /> Agendar cita ficticia</button>
          </form>
          <div className={card}>
            <h4 className="font-bold">Próximas citas de ejemplo</h4>
            <div className="mt-4 space-y-3">
              {appointments.map(a => <div key={a.id} className={'flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ' + outline}>
                <div><p className="text-sm font-bold">{a.plate} · {a.date}</p><p className={'mt-1 text-xs ' + muted}>{a.time} · {a.status}</p></div>
                <button type="button" disabled={a.status !== 'Pendiente'}
                  onClick={() => { setAppointments(v => v.map(x => x.id === a.id ? { ...x, status: 'Confirmada' } : x)); setNotice('Cita confirmada solo en esta demo.'); }}
                  className="rounded-lg border border-[#347df1]/30 px-3 py-2 text-xs font-bold text-[#347df1] disabled:opacity-40">Confirmar</button>
              </div>)}
            </div>
          </div>
        </div>
      </>}

      {screen === 'contabilidad' && <>
        {heading('Contabilidad y Finanzas', 'Caja y resultado de ejemplo. Las ventas simuladas actualizan estos indicadores.')}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Ingresos simulados', revenue, 'text-[#347df1]'],
            ['Egresos simulados', expenses.reduce((n,e) => n + e.total, 0), 'text-orange-500'],
            ['Balance de ejemplo', revenue - expenses.reduce((n,e)=>n+e.total,0), 'text-emerald-500'],
          ].map(([label,value,tint]) => <div className={card} key={String(label)}>
            <Wallet className={'h-5 w-5 ' + tint} /><p className={'mt-4 text-xs ' + muted}>{label}</p>
            <p className="mt-2 break-words text-xl font-extrabold">{format(Number(value))}</p>
          </div>)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form className={card} onSubmit={addExpense}>
            <h4 className="font-bold">Registrar egreso de ejemplo</h4>
            <label className={'mt-4 block text-xs ' + muted} htmlFor="demo-expense-name">Concepto</label>
            <input className={fieldClass + ' mt-2'} id="demo-expense-name" value={expenseName} maxLength={70} onChange={e => setExpenseName(e.target.value)} />
            <label className={'mt-4 block text-xs ' + muted} htmlFor="demo-expense-amount">Valor (COP)</label>
            <input id="demo-expense-amount" type="number" min="1" max="100000000" step="1" value={expense || ''} onChange={e => setExpense(Number(e.target.value))} className={fieldClass + ' mt-2'} required />
            <button className={buttonClass + ' mt-4 w-full'} type="submit">Registrar egreso ficticio</button>
          </form>
          <div className={card}>
            <h4 className="font-bold">Movimientos de caja</h4>
            <p className={'mt-2 text-sm ' + muted}>El sistema real también contempla cierres, categorías, compras y proveedores.</p>
            <div className="mt-5 space-y-2 text-sm">
              <p className={'flex justify-between gap-3 border-b pb-2 ' + outline}><span>Servicios y ventas simuladas</span><strong>{format(revenue)}</strong></p>
              {expenses.map((e,i) => <p key={i} className={'flex justify-between gap-3 border-b pb-2 ' + outline}><span>{e.name}</span><strong>- {format(e.total)}</strong></p>)}
            </div>
            <button type="button" onClick={() => onNavigate('ventas')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#347df1]">Simular otra venta <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </>}

      {screen === 'tecnicos' && <>
        {heading('Técnicos y Asignaciones', 'Distribuye órdenes activas y consulta la carga de cada técnico del taller de ejemplo.')}
        <div className="grid gap-3 md:grid-cols-3">
          {TECHNICIANS.map((name, i) => <div className={card} key={name}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#347df1]/10 text-[#347df1]"><UserRound className="h-5 w-5" /></span>
            <h4 className="mt-4 font-bold">{name}</h4><p className={'mt-1 text-xs ' + muted}>Técnico de ejemplo #{i + 1}</p>
            <p className="mt-4 text-2xl font-extrabold">{orders.filter(o => o.technician === name && o.status !== 'delivered').length}<span className={'ml-2 text-xs font-normal ' + muted}>órdenes abiertas</span></p>
          </div>)}
        </div>
        <div className={card + ' mt-4'}>
          <h4 className="font-bold">Asignar técnico a una orden</h4>
          <div className="mt-4 space-y-3">
            {orders.filter(o => o.status !== 'delivered').map(o => <div key={o.id} className={'flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 ' + outline}>
              <p className="text-sm"><strong>#{o.id}</strong> · {o.plate}<span className={'block text-xs ' + muted}>{o.service}</span></p>
              <select aria-label={'Técnico para orden ' + o.id} className={fieldClass + ' max-w-56'} value={o.technician || ''} onChange={e => { onAssignTechnician(o.id, e.target.value); setNotice('Asignación modificada solo en la demostración.'); }}>
                <option value="">Sin asignar</option>{TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>)}
          </div>
        </div>
      </>}

      {screen === 'permisos' && <>
        {heading('Usuarios y Permisos', 'Comprueba cómo un dueño puede configurar accesos por rol. El alcance depende del plan contratado.')}
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-[#347df1]" /> Permisos por módulo</h4>
            <select value={role} onChange={e => { setRole(e.target.value); setNotice(''); }} aria-label="Rol de demostración" className={fieldClass + ' max-w-52'}>
              {['Dueño', 'Administrador', 'Técnico', 'Recepcionista'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <p className={'mt-3 text-xs leading-6 ' + muted}>Ejemplos de roles disponibles. Marca o desmarca permisos para explorar la interfaz; no cambias accesos reales.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_MODULES.map(module => <label key={module} className={'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold ' + outline}>
              <input type="checkbox" checked={hasRole(module)} onChange={() => toggleRole(module)} className="h-4 w-4 accent-[#347df1]" />
              {module}
            </label>)}
          </div>
        </div>
      </>}

      {screen === 'soporte' && <>
        {heading('Centro de Soporte', 'Simula el ciclo de un ticket: pendiente, en revisión y finalizado.')}
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <form className={card} onSubmit={createTicket}>
            <h4 className="flex items-center gap-2 font-bold"><Headphones className="h-5 w-5 text-[#347df1]" /> Nueva solicitud</h4>
            <label htmlFor="demo-ticket" className={'mt-5 block text-xs ' + muted}>¿En qué necesitas ayuda?</label>
            <textarea id="demo-ticket" rows={3} value={ticketName} onChange={e => setTicketName(e.target.value)} minLength={4} maxLength={180}
              placeholder="Ejemplo: necesito configurar el inventario" required className={fieldClass + ' mt-2'} />
            <button className={buttonClass + ' mt-4 w-full'} type="submit"><Plus className="mr-1 inline h-4 w-4" /> Crear solicitud ficticia</button>
          </form>
          <div className={card}><h4 className="font-bold">Solicitudes de ejemplo</h4>
            <div className="mt-4 space-y-3">
              {tickets.map(t => <div key={t.id} className={'flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ' + outline}>
                <div><p className="text-sm font-bold">#{t.id} · {t.title}</p><span className={'mt-1 block text-xs ' + muted}>{t.status}</span></div>
                {t.status !== 'Finalizado' && <button type="button" className="rounded-lg border border-[#347df1]/30 px-3 py-2 text-xs font-bold text-[#347df1]"
                  onClick={() => setTickets(a => a.map(x => x.id === t.id ? { ...x, status: x.status === 'Pendiente' ? 'En Revisión' : 'Finalizado' } : x))}>Avanzar estado</button>}
              </div>)}
            </div>
          </div>
        </div>
      </>}

      {screen === 'portal' && <>
        {heading('Portal del Cliente', 'Así se presenta el historial vehicular al cliente vinculado al taller. Esta vista es ficticia, sin autenticación real.')}
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div className={card}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff821a]/10 text-[#ff821a]"><Bike className="h-6 w-6" /></span>
            <h4 className="mt-4 font-bold">Consultar una moto</h4>
            <label htmlFor="demo-portal-plate" className={'mt-5 block text-xs ' + muted}>Placa de ejemplo</label>
            <select id="demo-portal-plate" value={portalPlate} onChange={e => setPortalPlate(e.target.value)} className={fieldClass + ' mt-2'}>
              {bikes.map(b => <option key={b.plate} value={b.plate}>{b.plate}</option>)}
            </select>
            <p className={'mt-4 text-xs leading-6 ' + muted}>En el portal real el acceso se vincula con el taller y está protegido por verificación de identidad.</p>
          </div>
          <div className={card}>
            {bikes.filter(b => b.plate === portalPlate).map(b => <div key={b.plate}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#347df1]">Tu motocicleta</p>
              <h4 className="mt-2 text-2xl font-extrabold">{b.name}</h4><p className={'mt-1 text-sm ' + muted}>{b.plate} · {b.year} · {b.owner}</p>
              <h5 className={'mt-6 border-t pt-5 font-bold ' + outline}>Historial de órdenes</h5>
              <div className="mt-3 space-y-2">{orders.filter(o => o.plate === portalPlate).map(o =>
                <div key={o.id} className={'flex items-center justify-between gap-3 rounded-xl border p-3 ' + outline}>
                  <div><p className="text-sm font-bold">Orden #{o.id}</p><p className={'text-xs ' + muted}>{o.service}</p></div>
                  <strong className="text-xs text-[#347df1]">{o.status === 'delivered' ? 'Entregada' : o.status === 'diagnosis' ? 'Diagnóstico' : o.status === 'ready' ? 'Lista' : 'En taller'}</strong>
                </div>)}
                {!orders.some(o => o.plate === portalPlate) && <p className={'text-sm ' + muted}>Aún no tiene órdenes. Puedes crear una en la demo del taller.</p>}
              </div>
              <button type="button" onClick={() => onNavigate('citas')} className={buttonClass + ' mt-5'}><CalendarDays className="mr-1 inline h-4 w-4" /> Ver agenda de ejemplo</button>
            </div>)}
          </div>
        </div>
      </>}

      {screen === 'whatsapp' && <>
        {heading('Avisos por WhatsApp', 'Vista previa de mensajes por estado, sin enviar nada. La disponibilidad depende del plan y de la integración del taller.')}
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className={card}>
            <h4 className="flex items-center gap-2 font-bold"><MessageCircle className="h-5 w-5 text-emerald-500" /> Preparar aviso</h4>
            <label htmlFor="demo-whatsapp-order" className={'mt-5 block text-xs ' + muted}>Orden ficticia</label>
            <select id="demo-whatsapp-order" value={currentOrder?.id ?? ''} onChange={e => setMessageOrder(Number(e.target.value))} className={fieldClass + ' mt-2'}>
              {orders.map(o => <option key={o.id} value={o.id}>#{o.id} · {o.customer}</option>)}
            </select>
            <p className={'mt-5 text-sm leading-6 ' + muted}>El producto real dispone de avisos de recepción, cambios de estado, servicios y entrega; el envío depende de la configuración y la cuota.</p>
            <button type="button" className={buttonClass + ' mt-5'} onClick={() => onNavigate('ordenes')}>Cambiar estado de orden <ArrowRight className="ml-1 inline h-4 w-4" /></button>
          </div>
          <div className="rounded-2xl bg-[#0e342c] p-5 text-white shadow-sm sm:p-7">
            <p className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-5 w-5 text-emerald-300" /> Vista previa · no enviado</p>
            <div className="mt-6 ml-auto max-w-sm rounded-2xl rounded-tr-sm bg-[#d9f8d4] p-4 text-sm leading-7 text-[#173a27] shadow-lg">
              Hola {currentOrder?.customer || 'cliente'}, te saluda el Taller Ejemplo de MotoManager.
              La motocicleta {currentOrder?.plate || 'DEMO'} ({currentOrder?.bike || 'moto'}) está en estado
              <strong> {currentOrder?.status === 'delivered' ? 'Entregada' : currentOrder?.status === 'completed' ? 'Lista para entrega' : currentOrder?.status === 'diagnosis' ? 'Diagnosticando' : currentOrder?.status === 'in_progress' ? 'En reparación' : 'Recibida'}.</strong>
              Gracias por confiar en nosotros.
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200/20 bg-white/10 p-3 text-xs text-emerald-100">
              <BadgeCheck className="h-4 w-4" /> Solo una simulación visual. Ningún mensaje se envió.
            </div>
          </div>
        </div>
      </>}
      {notice && note(notice)}
      <div className={'mt-7 flex flex-wrap items-center gap-3 border-t pt-4 text-xs ' + outline}>
        <CreditCard className="h-4 w-4 text-[#347df1]" />
        <span className={muted}>Los datos son inventados y los cambios se pierden al salir de la página.</span>
      </div>
    </div>
  );
}


import Link from 'next/link';
import { LayoutDashboard, Store, Users, ChevronLeft, ReceiptText, HeartCrack } from 'lucide-react';
import WorkshopsTab from './WorkshopsTab';
import UsersTab from './UsersTab';
import KpiCards from './KpiCards';
import RevenueChart from './RevenueChart';
import AdminRealtime from './AdminRealtime';
import PaymentsTab from './PaymentsTab';
import CancellationsTab from './CancellationsTab';
import TicketsTab from './TicketsTab';
import PlanesTab from './PlanesTab';
import { getAllTicketsForAdmin } from '@/lib/data/tickets';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  
  const resolvedSearchParams = await searchParams;
  const currentView = resolvedSearchParams.view || 'menu';

  // Fetch all organizations
  const { data: orgs, error: orgsError } = await adminSupabase
    .from('organizations')
    .select(`
      *,
      members:organization_members(
        role,
        user_id,
        profile:profiles(first_name, last_name, phone, avatar_path)
      )
    `)
    .order('created_at', { ascending: false });

  if (orgsError) {
    return <div className="text-red-500">Error cargando talleres: {orgsError.message}</div>;
  }

  const workshops = orgs?.map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    subscription_status: org.settings?.plan === 'demo' ? 'trialing' : (org.status === 'active' ? 'active' : 'past_due'),
    subscription_plan: org.settings?.plan || 'monthly',
    subscription_end_date: org.settings?.demoEndDate || null,
    created_at: org.created_at,
    members: org.members?.map((m: any) => ({
      role: m.role,
      user_id: m.user_id,
      profile: {
        name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Sin Nombre',
        email: org.email || '',
        phone: m.profile?.phone || '',
        avatar_url: m.profile?.avatar_path || null
      }
    })) || []
  })) || [];

  // Fetch all users from profiles
  const { data: rawUsers, error: usersError } = await adminSupabase
    .from('profiles')
    .select(`
      *,
      workshop_members:organization_members(
        role,
        workshops:organizations(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error("Error loading users:", usersError);
  }

  // Fetch auth users to get emails and is_super_admin from user_metadata
  const { data: authData } = await adminSupabase.auth.admin.listUsers();
  const authUsersMap = new Map();
  if (authData && authData.users) {
    authData.users.forEach((u) => {
      authUsersMap.set(u.id, {
        email: u.email,
        is_super_admin: u.user_metadata?.is_super_admin === true
      });
    });
  }

  const users = rawUsers?.map((u: any) => {
    const authUser = authUsersMap.get(u.id) || {};
    return {
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Sin Nombre',
      email: authUser.email || u.email || '', 
      phone: u.phone,
      avatar_url: u.avatar_path,
      created_at: u.created_at,
      workshop_members: u.workshop_members,
      is_super_admin: authUser.is_super_admin || u.is_super_admin || false
    };
  }) || [];

  // Fetch plans from DB (or fallback to defaults if table doesn't exist yet)
  let dbPlans: any[] = [];
  let dbFeatures: any[] = [];
  try {
    const { data: p } = await adminSupabase.from('subscription_plans').select('*').order('months', { ascending: true });
    if (p) dbPlans = p;
    const { data: f } = await adminSupabase.from('subscription_features').select('*').order('order_index', { ascending: true });
    if (f) dbFeatures = f;
  } catch (err) {
    console.error("Error loading plans:", err);
  }

  const defaultPrices = { monthly: 18900, biannual: 99900, yearly: 199900 };
  const getPrice = (id: string, defaultP: number) => {
    const p = dbPlans.find(plan => plan.id === id);
    return p ? p.price : defaultP;
  };

  // Calculate KPIs
  const totalWorkshops = workshops?.length || 0;
  const activeWorkshops = workshops?.filter(w => w.subscription_status === 'active').length || 0;
  const trialingWorkshops = workshops?.filter(w => w.subscription_status === 'trialing').length || 0;
  const pastDueWorkshops = workshops?.filter(w => w.subscription_status === 'past_due' || w.subscription_status === 'unpaid').length || 0;
  
  const monthlyPlans = workshops?.filter(w => w.subscription_plan === 'monthly').length || 0;
  const annualPlans = workshops?.filter(w => w.subscription_plan === 'yearly').length || 0;
  
  // Calculate Active Plans for MRR
  const activeMonthly = workshops?.filter(w => w.subscription_status === 'active' && w.subscription_plan === 'monthly').length || 0;
  const activeBiannual = workshops?.filter(w => w.subscription_status === 'active' && w.subscription_plan === 'biannual').length || 0;
  const activeYearly = workshops?.filter(w => w.subscription_status === 'active' && w.subscription_plan === 'yearly').length || 0;

  // Real MRR calculation based on actual COP prices
  const mrr = 
    (activeMonthly * getPrice('monthly', defaultPrices.monthly)) + 
    (activeBiannual * Math.round(getPrice('biannual', defaultPrices.biannual) / 6)) + 
    (activeYearly * Math.round(getPrice('yearly', defaultPrices.yearly) / 12));

  // Fetch Wompi payments (Cash flow for chart)
  const { data: payments, error: paymentsError } = await adminSupabase
    .from('wompi_payments')
    .select('amount_in_cents, status, created_at')
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: true });
    
  if (paymentsError && paymentsError.code !== 'PGRST205') {
    console.error("Error loading payments:", paymentsError);
  }

  // Fetch cancellation feedback
  const { data: rawCancellations, error: cancellationsError } = await adminSupabase
    .from('cancellation_feedback')
    .select(`
      *,
      workshop:organizations(name, slug),
      owner:profiles(first_name, last_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (cancellationsError && cancellationsError.code !== 'PGRST205') {
    console.error("Error loading cancellations:", cancellationsError);
  }

  const cancellations = (rawCancellations || []).map((r: any) => ({
    id: r.id,
    workshop_id: r.workshop_id,
    user_id: r.user_id,
    reason_code: r.reason_code,
    reason_label: r.reason_label,
    status: r.status || 'pending',
    admin_notes: r.admin_notes || null,
    created_at: r.created_at,
    workshop: r.workshop ? { name: r.workshop.name, slug: r.workshop.slug } : null,
    owner: r.owner ? {
      name: `${r.owner.first_name || ''} ${r.owner.last_name || ''}`.trim() || 'Sin Nombre',
      email: authUsersMap.get(r.user_id)?.email || '',
      phone: r.owner.phone
    } : null,
  }));

  // Fetch admin tickets
  let adminTickets: any[] = [];
  try {
    adminTickets = await getAllTicketsForAdmin();
  } catch (e) {
    console.error("Error loading admin tickets:", e);
  }

  // Fetch subscription_transactions para historial de pagos completo
  const { data: allTransactions } = await adminSupabase
    .from('subscription_transactions')
    .select(`
      *,
      workshop:workshops(
        name,
        members:workshop_members(
          role,
          profile:user_profiles(name)
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  // Normalizar transacciones para el componente
  const normalizedTransactions = (allTransactions || []).map((tx: any) => {
    const owner = tx.workshop?.members?.find((m: any) => m.role === 'owner')?.profile?.name || null;
    return {
      id: tx.id,
      workshop_id: tx.workshop_id,
      wompi_transaction_id: tx.wompi_transaction_id,
      amount: tx.amount || 0,
      status: tx.status || 'PENDING',
      payment_method_type: tx.payment_method_type || 'CARD',
      created_at: tx.created_at,
      workshop: tx.workshop ? { name: tx.workshop.name } : null,
      owner,
    };
  });

  const txApproved = normalizedTransactions.filter(t => t.status === 'APPROVED').length;
  const txDeclined = normalizedTransactions.filter(t => t.status === 'DECLINED' || t.status === 'ERROR').length;
  const txPending  = normalizedTransactions.filter(t => t.status === 'PENDING').length;
  const txRevenue  = normalizedTransactions.filter(t => t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0);

  // Calculate Wompi Revenue
  let totalEarnings = 0;
  
  // Create an array for the last 6 months to populate the chart
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Initialize chart data for the last 6 months
  const chartDataMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonthIndex - i, 1);
    const monthName = months[d.getMonth()];
    chartDataMap.set(`${monthName} ${d.getFullYear().toString().slice(-2)}`, 0);
  }

  if (payments) {
    payments.forEach(payment => {
      const amount = (payment.amount_in_cents || 0) / 100;
      totalEarnings += amount;
      
      const paymentDate = new Date(payment.created_at);
      
      // Map to chart
      const monthKey = `${months[paymentDate.getMonth()]} ${paymentDate.getFullYear().toString().slice(-2)}`;
      if (chartDataMap.has(monthKey)) {
        chartDataMap.set(monthKey, chartDataMap.get(monthKey)! + amount);
      }
    });
  }

  const chartData = Array.from(chartDataMap.entries()).map(([name, ingresos]) => ({ name, ingresos }));

  // The menu cards have been hardcoded into the new Bento Grid layout below

  return (
    <div className="w-full bg-transparent text-foreground font-sans selection:bg-blue-500/30 relative">
      <AdminRealtime />
      {/* Main Content Area */}
      <main className="flex flex-col w-full max-w-7xl mx-auto z-10 relative">
        
        {currentView === 'menu' ? (
          /* MAIN MENU VIEW */
          <div className="w-full relative min-h-screen pt-4 pb-12">
            {/* Background orbs para que el Liquid Glass resalte como en Apple Control Center */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen" />
            <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0 mix-blend-screen" />

            <div className="w-full mx-auto z-10 relative">
              <div className="mb-4 lg:mb-6 mt-1 animate-in fade-in slide-in-from-top-4 duration-500">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  Panel de Administración
                </h1>
                <p className="text-sm sm:text-base text-foreground/70 flex items-center gap-2">
                  <span>Gestión global de la plataforma <span className="font-medium text-foreground">MotoManager</span>.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-3 lg:gap-4 animate-in fade-in zoom-in-95 duration-700">
                {/* 1. Hero Card - Dashboard Financiero */}
                <div className="md:col-span-8 lg:col-span-8 flex flex-col h-full group">
                  <div className="relative h-full min-h-[180px] sm:min-h-[200px] flex flex-col justify-between p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-xl overflow-hidden transition-all duration-300 hover:bg-foreground/[0.05] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2]">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none transition-colors duration-500 group-hover:bg-blue-500/30" />
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-2xl bg-blue-500 text-white shadow-md">
                          <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard Financiero</h2>
                      </div>
                      <p className="text-muted-foreground max-w-md text-xs sm:text-sm mb-5 font-medium line-clamp-2">
                        Resumen de métricas, MRR y crecimiento de la plataforma.
                      </p>
                      <div className="mt-auto">
                        <Link href="/admin?view=dashboard">
                          <button className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]">
                            Ver Dashboard
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Secondary Card - Gestión de Talleres */}
                <div className="md:col-span-4 lg:col-span-4 h-full">
                  <Link href="/admin?view=workshops" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
                    <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0">
                      <div className="relative z-10 flex flex-col h-full min-w-0">
                        <div className="p-2 rounded-2xl text-white w-fit mb-3 shadow-sm bg-indigo-500">
                          <Store className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">Gestión de Talleres</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">Administra los talleres registrados</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* 3. Secondary Card - Control de Usuarios */}
                <div className="md:col-span-4 lg:col-span-4 h-full">
                  <Link href="/admin?view=users" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
                    <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0">
                      <div className="relative z-10 flex flex-col h-full min-w-0">
                        <div className="p-2 rounded-2xl text-white w-fit mb-3 shadow-sm bg-emerald-500">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">Control de Usuarios</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">Gestiona accesos y roles del sistema</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* 4. Secondary Card - Gestión de Planes */}
                <div className="md:col-span-4 lg:col-span-4 h-full">
                  <Link href="/admin?view=planes" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
                    <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0">
                      <div className="relative z-10 flex flex-col h-full min-w-0">
                        <div className="p-2 rounded-2xl text-white w-fit mb-3 shadow-sm bg-amber-500">
                          <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">Gestión de Planes</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">Modifica precios y características</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* 5. Secondary Card - Historial de Pagos */}
                <div className="md:col-span-4 lg:col-span-4 h-full">
                  <Link href="/admin?view=payments" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl min-w-0">
                    <div className="relative h-full min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-3xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[50px] border border-foreground/[0.08] dark:border-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] flex flex-col min-w-0">
                      <div className="relative z-10 flex flex-col h-full min-w-0">
                        <div className="p-2 rounded-2xl text-white w-fit mb-3 shadow-sm bg-green-500">
                          <ReceiptText className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight mb-1 truncate">Historial de Pagos</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-auto line-clamp-2">Transacciones de todos los talleres</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* 6. Tertiary Small Card - Cancelaciones */}
                <div className="md:col-span-4 lg:col-span-6 h-full">
                  <Link href="/admin?view=cancellations" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl min-w-0">
                    <div className="relative h-full p-4 sm:p-5 rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[40px] border border-foreground/[0.08] dark:border-white/[0.1] transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] min-w-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 rounded-xl text-white shadow-sm shrink-0 bg-rose-500">
                          <HeartCrack className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-foreground truncate">Cancelaciones</h3>
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">Feedback de clientes</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* 7. Tertiary Small Card - Soporte */}
                <div className="md:col-span-4 lg:col-span-6 h-full">
                  <Link href="/admin?view=tickets" className="block h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl min-w-0">
                    <div className="relative h-full p-4 sm:p-5 rounded-2xl bg-foreground/[0.03] dark:bg-white/[0.05] backdrop-blur-[40px] border border-foreground/[0.08] dark:border-white/[0.1] transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:border-foreground/[0.15] dark:hover:border-white/[0.2] active:scale-[0.98] min-w-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 rounded-xl text-white shadow-sm shrink-0 bg-cyan-500">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-foreground truncate">Soporte y Tickets</h3>
                          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">Resolver problemas</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SUB-VIEWS */
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 -mt-2 md:-mt-6">
            {/* Top Navigation Bar with Back Button */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border dark:border-white/10 pb-6">
              <div>
                <Link href="/admin?view=menu" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors mb-4 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 w-fit">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Volver al panel principal
                </Link>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white tracking-tight">
                  {currentView === 'dashboard' && 'Dashboard Financiero'}
                  {currentView === 'workshops' && 'Gestión de Talleres'}
                  {currentView === 'users' && 'Control de Usuarios'}
                  {currentView === 'planes' && 'Gestión de Planes'}
                  {currentView === 'payments' && 'Historial de Pagos'}
                  {currentView === 'cancellations' && 'Cancelaciones y Quejas'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {currentView === 'dashboard' && 'Resumen de métricas de alto nivel y crecimiento.'}
                  {currentView === 'workshops' && 'Administra los talleres registrados en la plataforma.'}
                  {currentView === 'users' && 'Gestiona los accesos y roles de los usuarios.'}
                  {currentView === 'planes' && 'Modifica los precios, descripciones y las características de los planes en la tabla comparativa.'}
                  {currentView === 'payments' && 'Registro completo de todas las transacciones procesadas.'}
                  {currentView === 'cancellations' && `Clientes que intentaron cancelar o enviaron feedback (${cancellations.length} registros).`}
                  {currentView === 'tickets' && 'Resuelve los tickets de soporte reportados por los talleres.'}
                </p>
              </div>
            </header>

            {/* Conditional Rendering based on view */}
            {currentView === 'dashboard' && (
              <div className="space-y-8">
                <KpiCards 
                  totalWorkshops={totalWorkshops} 
                  activeWorkshops={activeWorkshops}
                  trialingWorkshops={trialingWorkshops}
                  pastDueWorkshops={pastDueWorkshops}
                  mrr={mrr}
                  totalEarnings={totalEarnings}
                  monthlyPlans={monthlyPlans}
                  annualPlans={annualPlans}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <RevenueChart data={chartData} />
                  </div>
                  <div className="p-6 rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 backdrop-blur-md flex flex-col justify-center items-center text-center shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                      <Store className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground dark:text-white mb-2">Crecimiento Sostenido</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      El MRR se ha incrementado un 15% este mes gracias a las nuevas conversiones de planes anuales.
                    </p>
                    <button className="px-6 py-2.5 rounded-full bg-muted dark:bg-white/5 hover:bg-muted-foreground/10 dark:hover:bg-white/10 border border-border dark:border-white/10 text-foreground dark:text-white text-sm font-medium transition-all">
                      Ver Reporte Detallado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'workshops' && (
               <WorkshopsTab workshops={workshops || []} />
            )}

            {currentView === 'users' && (
               <UsersTab users={users || []} />
            )}

            {currentView === 'planes' && (
               <PlanesTab plans={dbPlans} features={dbFeatures} />
            )}

            {currentView === 'payments' && (
              <PaymentsTab
                payments={normalizedTransactions}
                totalRevenue={txRevenue}
                approvedCount={txApproved}
                declinedCount={txDeclined}
                pendingCount={txPending}
              />
            )}

            {currentView === 'cancellations' && (
              <CancellationsTab records={cancellations} />
            )}

            {currentView === 'tickets' && (
              <TicketsTab initialTickets={adminTickets} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

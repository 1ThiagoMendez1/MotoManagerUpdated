import { createClient } from '@/lib/supabase/server';
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const adminSupabase = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const resolvedSearchParams = await searchParams;
  const currentView = resolvedSearchParams.view || 'menu';

  // Fetch all workshops
  const { data: workshops, error: workshopsError } = await adminSupabase
    .from('workshops')
    .select(`
      *,
      members:workshop_members(
        role,
        user_id,
        profile:user_profiles(name, email, phone, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (workshopsError) {
    return <div className="text-red-500">Error cargando talleres: {workshopsError.message}</div>;
  }

  // Fetch all users
  const { data: users, error: usersError } = await adminSupabase
    .from('user_profiles')
    .select(`
      *,
      workshop_members(
        role,
        workshops(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error("Error loading users:", usersError);
  }

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
    
  if (paymentsError) {
    console.error("Error loading payments:", paymentsError);
  }

  // Fetch cancellation feedback
  const { data: rawCancellations, error: cancellationsError } = await adminSupabase
    .from('cancellation_feedback')
    .select(`
      *,
      workshop:workshops(name, slug),
      owner:user_profiles(name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (cancellationsError) {
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
    owner: r.owner ? { name: r.owner.name, email: r.owner.email, phone: r.owner.phone } : null,
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

  const menuCards = [
    { 
      id: 'dashboard', 
      title: 'Dashboard Financiero', 
      description: 'Resumen de métricas y crecimiento', 
      icon: LayoutDashboard 
    },
    { 
      id: 'workshops', 
      title: 'Gestión de Talleres', 
      description: 'Administra los talleres registrados', 
      icon: Store 
    },
    { 
      id: 'users', 
      title: 'Control de Usuarios', 
      description: 'Gestiona accesos y roles del sistema', 
      icon: Users 
    },
    { 
      id: 'planes', 
      title: 'Gestión de Planes', 
      description: 'Modifica precios y características', 
      icon: LayoutDashboard // Or a different icon if preferred, maybe just use LayoutDashboard
    },
    {
      id: 'payments',
      title: 'Historial de Pagos',
      description: 'Transacciones de todos los talleres',
      icon: ReceiptText
    },
    {
      id: 'cancellations',
      title: 'Cancelaciones y Quejas',
      description: 'Clientes que intentaron cancelar o dejaron feedback',
      icon: HeartCrack
    },
    {
      id: 'tickets',
      title: 'Soporte y Tickets',
      description: 'Ver y solucionar problemas de los talleres',
      icon: Users // Assuming we want an icon here, or we can use Mail/MessageCircle if available, but let's just reuse Users or a similar one imported above. Actually, we imported HeartCrack, ReceiptText... I'll just use Users for now, or maybe add Ticket. Let me add Ticket to imports above. Wait, I'll just use Store or Users to be safe since I didn't add Ticket to imports yet. Let me use ReceiptText. No, I'll add a generic one. Let me import LifeBuoy at the top. I'll just use HeartCrack or Users. Let's use Users for now to avoid import errors.
    },
  ];

  return (
    <div className="w-full bg-transparent text-foreground font-sans selection:bg-blue-500/30 relative">
      <AdminRealtime />
      {/* Main Content Area */}
      <main className="flex flex-col w-full max-w-7xl mx-auto z-10 relative">
        
        {currentView === 'menu' ? (
          /* MAIN MENU VIEW */
          <div className="flex flex-col items-center justify-center w-full animate-in fade-in zoom-in-95 duration-700 mt-10 lg:mt-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground dark:text-white tracking-tight mb-4 drop-shadow-md">
                Panel de Administración
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Selecciona una opción para comenzar a gestionar la plataforma MotoManager.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {menuCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link href={`/admin?view=${card.id}`} key={card.id}>
                    <div className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-card dark:bg-[#111623] border border-border dark:border-white/5 hover:border-blue-500/30 dark:hover:bg-[#151b2b] hover:bg-muted/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-1 h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                        <Icon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">{card.title}</h2>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </Link>
                );
              })}
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

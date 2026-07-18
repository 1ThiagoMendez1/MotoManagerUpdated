'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, Shield, Lock, Loader2, ArrowRight, HeartCrack, Gift, TrendingUp, Users, Wrench, Star, AlertTriangle, X, ChevronRight, Zap, Trophy } from 'lucide-react';
import { WompiSubscriptionForm } from '@/components/payments/WompiSubscriptionForm';
import { WompiButton } from '@/components/payments/WompiButton';
import { updateSubscriptionPlan } from '@/lib/actions/subscription';
import { saveCancellationFeedback } from '@/lib/actions/cancellation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const PLANS = [
  {
    id: 'monthly' as const,
    name: 'Mensual',
    price: 18900,
    amountInCents: 1890000,
    period: '/ mes',
    months: 1,
    description: 'Para empezar sin compromiso',
    badge: null as string | null,
    savings: null as string | null,
    gradient: 'from-primary/20 to-primary/10 dark:from-primary/40 dark:to-primary/20',
    border: 'border-primary/25',
    accentText: 'text-primary',
    btn: 'from-primary to-primary/80 hover:opacity-90 text-primary-foreground shadow-primary/25',
  },
  {
    id: 'biannual' as const,
    name: 'Semestral',
    price: 99900,
    amountInCents: 9990000,
    period: '/ 6 meses',
    months: 6,
    description: 'El más elegido por los talleres',
    badge: 'MÁS POPULAR',
    savings: 'Ahorra $13.500',
    gradient: 'from-amber-100/80 to-orange-100/60 dark:from-amber-900/40 dark:to-orange-800/20',
    border: 'border-amber-500/40',
    accentText: 'text-amber-600 dark:text-amber-400',
    btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25',
  },
  {
    id: 'yearly' as const,
    name: 'Anual',
    price: 199900,
    amountInCents: 19990000,
    period: '/ año',
    months: 12,
    description: 'El mejor valor para tu negocio',
    badge: 'MEJOR VALOR',
    savings: 'Ahorra $26.900',
    gradient: 'from-purple-100/80 to-purple-50/60 dark:from-purple-900/40 dark:to-purple-800/20',
    border: 'border-purple-500/30',
    accentText: 'text-purple-600 dark:text-purple-400',
    btn: 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-500/25',
  },
];

const ALL_FEATURES = [
  'Clientes y motos ilimitados',
  'Órdenes de trabajo ilimitadas',
  'Control de inventario completo',
  'Ventas y facturación digital',
  'Reportes exportables (Excel)',
  'WhatsApp automático',
  'Pagos digitales con Wompi',
  'Multi-técnico con roles',
  'Dashboard con estadísticas',
  'Soporte por WhatsApp',
];

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

interface ManageSubscriptionProps {
  currentPlan: string;
  userName: string;
  userEmail: string;
  userId: string;
  workshopSlug: string;
  workshopId: string;
}

export function ManageSubscriptionClient({ 
  currentPlan,
  userName,
  userEmail,
  userId,
  workshopSlug,
  workshopId
}: ManageSubscriptionProps) {
  const [activePlan, setActivePlan] = useState(currentPlan);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [paymentMode, setPaymentMode] = useState<'automatic' | 'manual'>('manual'); // Nequi/PSE by default to avoid 404 errors with direct API while we fix tokenization
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2 | 3>(0); // 0=closed, 1=reasons, 2=counter-offer, 3=final-confirm
  const [cancelReason, setCancelReason] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActivePlan(currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    setMounted(true);
    // Process successful payment redirect
    const paymentStatus = searchParams.get('payment');
    const planToUpdate = searchParams.get('plan');
    
    if (paymentStatus === 'success' && planToUpdate && !isUpdating) {
      handlePaymentSuccess(planToUpdate);
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (plan: string) => {
    setIsUpdating(true);
    const formData = new FormData();
    formData.append('plan', plan);
    
    try {
      const res = await updateSubscriptionPlan(formData);
      if (res.error) throw new Error(res.error);
      
      setActivePlan(plan);
      
      toast({
        title: '¡Suscripción actualizada!',
        description: 'Tu pago fue recibido y tu plan ha sido mejorado con éxito.',
        variant: 'default',
      });
      // Remove query params and refresh server data
      router.replace('/dashboard/subscription');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error al actualizar',
        description: error.message || 'Hubo un error al procesar tu cambio de plan.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlanLabel = (planId: string) => {
    return PLANS.find(p => p.id === planId)?.name || planId;
  };

  const modalContent = selectedPlan ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPlan(null)} />
      <div className="relative w-full max-w-md bg-background dark:bg-[#0d1117] border border-border/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 p-5 border-b border-border/30">
          <div className="p-2 bg-primary/20 rounded-xl">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">Actualizar a Plan {selectedPlan.name}</h2>
            <p className="text-muted-foreground text-xs">
              Confirma tu pago con Wompi
            </p>
          </div>
          <button onClick={() => setSelectedPlan(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none px-2">×</button>
        </div>

        <div className="p-5 space-y-6">
          <div className={`p-4 rounded-xl bg-gradient-to-br ${selectedPlan.gradient} border ${selectedPlan.border}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Total a pagar</p>
                <p className="text-2xl font-extrabold text-foreground">{formatCOP(selectedPlan.price)}</p>
                <p className="text-muted-foreground text-xs">{selectedPlan.period}</p>
              </div>
              {selectedPlan.savings && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-400/25 text-green-400 font-medium">
                  {selectedPlan.savings}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex bg-muted p-1 rounded-xl mb-4">
              <button 
                onClick={() => setPaymentMode('manual')}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${paymentMode === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Pago Único (PSE, Nequi)
              </button>
              <button 
                onClick={() => setPaymentMode('automatic')}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${paymentMode === 'automatic' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Débito Automático (Tarjeta)
              </button>
            </div>

            {paymentMode === 'automatic' ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
                  Ingresa los datos de tu tarjeta para suscribirte. El cobro se realizará automáticamente de forma segura cada ciclo.
                </p>
                <div className="flex justify-center py-2">
                  <WompiSubscriptionForm
                    planId={selectedPlan.id}
                    workshopId={workshopId}
                    userEmail={userEmail}
                    userName={userName}
                    amountToPay={selectedPlan.amountInCents}
                    onSuccess={() => {
                      setSelectedPlan(null);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
                  Paga con PSE, Nequi o Efecty. Serás redirigido a Wompi. Cuando el plan expire en {selectedPlan.months} {selectedPlan.months === 1 ? 'mes' : 'meses'}, te enviaremos un WhatsApp para que renueves manualmente.
                </p>
                <div className="flex justify-center py-2">
                  <WompiButton
                    amountInCents={selectedPlan.amountInCents}
                    reference={`SUB-UPG-${userId}-${Date.now().toString(36).toUpperCase()}`}
                    customerEmail={userEmail}
                    customerName={userName}
                    redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/subscription?payment=success&plan=${selectedPlan.id}`}
                    buttonLabel={`Pagar ${formatCOP(selectedPlan.price)} con Wompi`}
                  />
                </div>
                
                <div className="flex items-center justify-center gap-4 text-foreground/30 text-xs pt-4">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Pago cifrado SSL</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Powered by Wompi</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-12 pb-12">
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Gestionar Suscripción</h1>
        <p className="text-muted-foreground text-lg">
          Tu plan actual es <span className="font-semibold text-primary capitalize">{getPlanLabel(activePlan)}</span>
        </p>
      </div>

      {isUpdating && (
        <div className="flex flex-col items-center justify-center p-8 bg-card/30 rounded-2xl border border-border/50 text-center animate-pulse">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-bold">Procesando tu pago...</h3>
          <p className="text-muted-foreground">Por favor espera, estamos actualizando tu cuenta.</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {PLANS.map(plan => {
          const isCurrent = plan.id === activePlan;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col gap-6 rounded-2xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 transition-all ${isCurrent ? 'ring-2 ring-primary/50 shadow-xl' : 'hover:scale-[1.02] hover:shadow-2xl'} ${plan.badge === 'MÁS POPULAR' && !isCurrent ? 'ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-bold text-primary-foreground bg-primary shadow-lg shadow-primary/30">
                    Plan Actual
                  </span>
                </div>
              )}
              {plan.badge && !isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-foreground bg-gradient-to-r ${plan.id === 'biannual' ? 'from-amber-500 to-orange-500' : 'from-purple-600 to-purple-500'}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="space-y-1 pt-2">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                {plan.savings && (
                  <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium">
                    ✓ {plan.savings}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">{formatCOP(plan.price)}</span>
                </div>
                <p className={`text-sm mt-0.5 ${plan.accentText}`}>{plan.period}</p>
                {plan.months > 1 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {formatCOP(Math.round(plan.price / plan.months))}/mes
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {ALL_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/75">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground font-semibold h-12 rounded-xl border border-border/50 text-sm cursor-not-allowed"
                >
                  Plan Activo
                </button>
              ) : (
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${plan.btn} text-foreground font-semibold h-12 rounded-xl shadow-lg transition-all hover:scale-105 text-sm`}
                >
                  <CreditCard className="h-4 w-4" />
                  Cambiar a {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 bg-card/30 border border-border/50 max-w-2xl mx-auto p-6 rounded-2xl text-center">
          <h3 className="text-lg font-semibold mb-2">¿Necesitas cancelar?</h3>
          <p className="text-sm text-muted-foreground mb-4">
              Puedes cancelar tu suscripción en cualquier momento. Al hacerlo, tu plan se mantendrá activo hasta el final del ciclo de facturación actual.
          </p>
          <button
            onClick={() => setCancelStep(1)}
            className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors bg-destructive/10 px-4 py-2 rounded-lg border border-destructive/20"
          >
            Cancelar Suscripción
          </button>
      </div>

      {/* Payment Modal using React Portal to prevent background cut-off */}
      {mounted && typeof window !== 'undefined' && modalContent ? createPortal(modalContent, document.body) : modalContent}

      {/* ============================================================ */}
      {/* CANCEL RETENTION MODAL — Full persuasion flow via Portal      */}
      {/* ============================================================ */}
      {mounted && typeof window !== 'undefined' && cancelStep > 0 && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Retención de suscripción"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => { if (cancelStep !== 3) { setCancelStep(0); setCancelReason(''); } }}
          />

          {/* ── STEP 1: Reasons ─────────────────────────────────────── */}
          {cancelStep === 1 && (
            <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-300">
              {/* Glow border effect */}
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-amber-500/50 via-orange-500/30 to-rose-500/50 blur-sm" />
              <div className="relative bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                {/* Header gradient */}
                <div className="relative bg-gradient-to-br from-amber-500/20 via-orange-600/10 to-rose-600/10 px-7 pt-8 pb-6 text-center">
                  <button
                    onClick={() => { setCancelStep(0); setCancelReason(''); }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/20 border border-amber-400/20 mb-4 mx-auto">
                    <HeartCrack className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">Espera, {userName.split(' ')[0]}...</h2>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Antes de irte, cuéntanos qué pasó. Tu opinión nos ayuda a mejorar.
                  </p>
                </div>

                {/* Reasons list */}
                <div className="px-7 pb-7 pt-5 space-y-2.5">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">¿Cuál es el motivo principal?</p>
                  {[
                    { id: 'price', icon: '💸', label: 'El precio es muy alto' },
                    { id: 'features', icon: '🔧', label: 'Me faltan funciones que necesito' },
                    { id: 'complicated', icon: '😕', label: 'Es complicado de usar' },
                    { id: 'not_using', icon: '😴', label: 'No lo estoy usando lo suficiente' },
                    { id: 'competitor', icon: '🔄', label: 'Me cambio a otra plataforma' },
                    { id: 'pausing', icon: '⏸️', label: 'Solo quiero pausar por ahora' },
                  ].map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => { setCancelReason(reason.id); setCancelStep(2); }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all group
                        ${ cancelReason === reason.id
                          ? 'bg-amber-500/15 border-amber-500/40 text-white'
                          : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/15 text-white/70 hover:text-white'
                        }`}
                    >
                      <span className="text-xl">{reason.icon}</span>
                      <span className="text-sm font-medium flex-1 text-left">{reason.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Counter-offer ────────────────────────────────── */}
          {cancelStep === 2 && (
            <div className="relative w-full max-w-xl animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-purple-500/60 via-blue-500/40 to-emerald-500/40 blur-sm" />
              <div className="relative bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                {/* Top banner */}
                <div className="relative bg-gradient-to-r from-purple-600/30 via-blue-600/20 to-emerald-600/20 px-7 pt-8 pb-6">
                  <button
                    onClick={() => setCancelStep(1)}
                    className="absolute top-4 left-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3 justify-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 border border-purple-400/20">
                      <Gift className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Oferta especial solo para ti</p>
                      <h2 className="text-xl font-extrabold text-white">No pierdas todo lo que construiste 🚀</h2>
                    </div>
                  </div>
                </div>

                <div className="px-7 py-6 space-y-5">
                  {/* Loss stats — emotional anchoring */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <Users className="h-5 w-5 text-blue-400" />, label: 'Clientes registrados', value: 'Se perderán', color: 'from-blue-500/15 to-blue-600/5', border: 'border-blue-500/20' },
                      { icon: <Wrench className="h-5 w-5 text-orange-400" />, label: 'Historial de OT', value: 'Inaccesible', color: 'from-orange-500/15 to-orange-600/5', border: 'border-orange-500/20' },
                      { icon: <TrendingUp className="h-5 w-5 text-rose-400" />, label: 'Reportes e ingresos', value: 'Sin acceso', color: 'from-rose-500/15 to-rose-600/5', border: 'border-rose-500/20' },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-2xl p-3.5 text-center`}>
                        <div className="flex justify-center mb-2">{stat.icon}</div>
                        <p className="text-white font-bold text-xs">{stat.value}</p>
                        <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Special offer card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/10 border border-emerald-400/25 rounded-2xl p-5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="flex items-start gap-3 relative">
                      <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/20 shrink-0 mt-0.5">
                        <Zap className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-emerald-300 font-bold text-sm mb-1">💡 ¿Sabías que...?</p>
                        <p className="text-white/70 text-sm leading-relaxed">
                          Los talleres que usan MotoManager facturan en promedio un{' '}
                          <span className="text-emerald-400 font-bold">37% más</span> que antes de digitalizarse.
                          Tu taller ya lleva una ventaja sobre la competencia.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Features reminder */}
                  <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Lo que perderías al cancelar</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        '📋 Órdenes de trabajo ilimitadas',
                        '📦 Control de inventario completo',
                        '📲 WhatsApp automático',
                        '📊 Dashboard con estadísticas',
                        '💳 Pagos digitales con Wompi',
                        '👥 Multi-técnico con roles',
                      ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Social proof */}
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3.5">
                    <Star className="h-5 w-5 text-amber-400 shrink-0" />
                    <p className="text-white/70 text-sm leading-snug">
                      <span className="text-amber-300 font-semibold">+200 talleres en Colombia</span> confían en MotoManager para gestionar su negocio a diario.
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3 pt-1">
                    <button
                      onClick={() => { setCancelStep(0); setCancelReason(''); }}
                      className="w-full flex items-center justify-center gap-2.5 h-13 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-purple-500/40"
                    >
                      <Trophy className="h-5 w-5" />
                      ¡Quiero seguir creciendo mi taller!
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCancelStep(3)}
                      className="w-full text-xs text-white/25 hover:text-white/40 transition-colors py-2"
                    >
                      No me interesa, continuar con la cancelación →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Final confirmation ───────────────────────────── */}
          {cancelStep === 3 && (
            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-rose-600/40 via-red-500/30 to-orange-500/20 blur-sm" />
              <div className="relative bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

                <div className="relative bg-gradient-to-br from-rose-600/25 via-red-700/10 to-transparent px-7 pt-8 pb-5 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/15 border border-rose-400/20 mb-4 mx-auto">
                    <AlertTriangle className="h-7 w-7 text-rose-400" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white mb-2">¿Estás completamente seguro?</h2>
                  <p className="text-white/55 text-sm leading-relaxed">
                    Tu cuenta y todos tus datos se mantendrán activos hasta el fin del ciclo actual. Después, <span className="text-rose-300 font-semibold">perderás el acceso permanentemente</span>.
                  </p>
                </div>

                <div className="px-7 pb-7 pt-2 space-y-4">
                  {/* Final loss warning */}
                  <div className="bg-rose-500/8 border border-rose-400/15 rounded-2xl p-4 space-y-2">
                    {[
                      'Todo tu historial de órdenes de trabajo',
                      'Los datos de tus clientes y motos',
                      'Tus reportes de ingresos y estadísticas',
                      'El acceso al soporte por WhatsApp',
                    ].map((loss, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-rose-300/80">
                        <X className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        {loss}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <button
                      onClick={() => { setCancelStep(0); setCancelReason(''); }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Mejor me quedo, ¡no cancelo!
                    </button>
                    <button
                      onClick={async () => {
                        // Save feedback to DB so admin can see it
                        const result = await saveCancellationFeedback(cancelReason);
                        setCancelStep(0);
                        setCancelReason('');
                        if (result.success) {
                          toast({
                            title: 'Solicitud recibida',
                            description: 'Tu suscripción permanecerá activa hasta el fin del ciclo. Te contactaremos para ayudarte.',
                            variant: 'default',
                          });
                        } else {
                          toast({
                            title: 'Error al enviar la solicitud',
                            description: 'Hubo un problema al procesar tu cancelación. Por favor intenta de nuevo.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      className="w-full text-xs text-white/20 hover:text-white/35 transition-colors py-2"
                    >
                      Confirmar cancelación de todas formas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

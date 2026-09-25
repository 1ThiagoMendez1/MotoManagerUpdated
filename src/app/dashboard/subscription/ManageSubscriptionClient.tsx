'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, Shield, Lock, Loader2, ArrowRight, HeartCrack, Gift, TrendingUp, Users, Wrench, Star, AlertTriangle, X, ChevronRight, Zap, Trophy, Sparkles, Clock } from 'lucide-react';
import { WompiSubscriptionForm } from '@/components/payments/WompiSubscriptionForm';
import { WompiButton } from '@/components/payments/WompiButton';
import { updateSubscriptionPlan } from '@/lib/actions/subscription';
import { saveCancellationFeedback } from '@/lib/actions/cancellation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
  currentBillingCycle?: 'monthly' | 'biannual' | 'yearly';
  startDate?: string | null;
  endDate?: string | null;
  paidAmount?: number | null;
  userName: string;
  userEmail: string;
  userId: string;
  workshopSlug: string;
  workshopId: string;
  plans: any[];
  features: any[];
}

export function ManageSubscriptionClient({ 
  currentPlan,
  currentBillingCycle = 'monthly',
  startDate = null,
  endDate = null,
  paidAmount = null,
  userName,
  userEmail,
  userId,
  workshopSlug,
  workshopId,
  plans,
  features
}: ManageSubscriptionProps) {
  const [activePlan, setActivePlan] = useState(currentPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'biannual' | 'yearly'>(
    currentBillingCycle || 'monthly'
  );
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<'automatic' | 'manual'>('manual');
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2 | 3>(0);
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
    const cycleToUpdate = searchParams.get('cycle') || 'monthly';
    const amountToUpdate = searchParams.get('amount') || '0';
    
    if (paymentStatus === 'success' && planToUpdate && !isUpdating) {
      handlePaymentSuccess(planToUpdate, cycleToUpdate, amountToUpdate);
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (plan: string, cycle?: string, amount?: string) => {
    setIsUpdating(true);
    const formData = new FormData();
    formData.append('plan', plan);
    if (cycle) formData.append('billingCycle', cycle);
    if (amount) formData.append('paidAmount', amount);
    
    try {
      const res = await updateSubscriptionPlan(formData);
      if (res.error) throw new Error(res.error);
      
      setActivePlan(plan);
      if (cycle) setBillingCycle(cycle as any);
      
      toast({
        title: '¡Suscripción actualizada!',
        description: 'Tu pago fue recibido y tu plan ha sido mejorado con éxito.',
        variant: 'default',
      });
      setSelectedPlan(null);
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

  const normalizedActivePlan = activePlan === 'monthly' ? 'basic' : activePlan;

  const getPlanLabel = (planId: string) => {
    const id = planId === 'monthly' ? 'basic' : planId;
    return plans.find(p => p.id === id)?.name || (id === 'pro' ? 'Pro Taller' : id === 'full' ? 'Full Taller' : 'Básico');
  };

  const getCycleInfo = (cycle: string) => {
    if (cycle === 'biannual') return { months: 6, discount: 0.9, label: '/ 6 meses', name: 'Semestral', discountText: '-10%' };
    if (cycle === 'yearly') return { months: 12, discount: 0.8, label: '/ año', name: 'Anual', discountText: '-20%' };
    return { months: 1, discount: 1, label: '/ mes', name: 'Mensual', discountText: null };
  };

  // Prorated credit calculation
  const now = new Date();
  let remainingDays = 0;
  let totalDays = 0;
  let creditRemaining = 0;

  // Resolve effective start & end dates (matching Header logic)
  const effectiveStartDate = startDate || new Date().toISOString();
  
  // Detect active cycle: from prop or duration between dates
  let detectedCycle = currentBillingCycle || 'monthly';
  if (endDate && startDate) {
    const durationDays = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    if (durationDays >= 250) {
      detectedCycle = 'yearly';
    } else if (durationDays >= 120) {
      detectedCycle = 'biannual';
    }
  }

  let effectiveEndDate = endDate;
  if (!effectiveEndDate) {
    const d = new Date(effectiveStartDate);
    const monthsToAdd = detectedCycle === 'yearly' ? 12 : detectedCycle === 'biannual' ? 6 : 1;
    d.setMonth(d.getMonth() + monthsToAdd);
    effectiveEndDate = d.toISOString();
  }

  const end = new Date(effectiveEndDate);
  const start = new Date(effectiveStartDate);

  // Determine cost of active plan according to its billing cycle (mensual, semestral o anual)
  const curCycle = getCycleInfo(detectedCycle);
  let currentCost = paidAmount;
  if (!currentCost || currentCost <= 0) {
    const currentPlanObj = plans.find(p => p.id === normalizedActivePlan) || plans[0];
    currentCost = Math.round((currentPlanObj?.price || 49900) * curCycle.months * curCycle.discount);
  }

  if (end.getTime() > now.getTime()) {
    totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (totalDays > 0 && remainingDays > 0 && currentCost > 0) {
      // Si el usuario acaba de adquirir el plan o le queda la mayor parte del ciclo (ej. primeros 5 días),
      // abonamos el 100% del valor pagado del plan. Si ha pasado más tiempo, se prorratea.
      if (remainingDays >= (totalDays - 5)) {
        creditRemaining = currentCost;
      } else {
        const dailyRate = currentCost / totalDays;
        creditRemaining = Math.min(currentCost, Math.round(dailyRate * remainingDays));
      }
    }
  } else if (normalizedActivePlan && currentCost > 0) {
    // Si la organización tiene el plan activo en sesión pero la fecha calculada cayó en el pasado,
    // garantizamos el abono del plan activo.
    creditRemaining = currentCost;
    remainingDays = curCycle.months * 30;
    totalDays = curCycle.months * 30;
  }

  // Sort plans by price ascending (Básico -> Pro -> Full)
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);
  
  // Calculate orders so the active plan is always in the middle (index 1)
  const getPlanOrder = (planId: string, index: number) => {
    if (planId === normalizedActivePlan) return 'order-first md:order-2';
    
    if (normalizedActivePlan === sortedPlans[0]?.id) {
      if (index === 1) return 'order-2 md:order-1';
      if (index === 2) return 'order-last md:order-3';
    }
    
    if (normalizedActivePlan === sortedPlans[2]?.id) {
      if (index === 0) return 'order-2 md:order-1';
      if (index === 1) return 'order-last md:order-3';
    }
    
    if (index === 0) return 'order-1';
    if (index === 2) return 'order-3';
    
    return 'order-none';
  };

  const sortedFeatures = [...features].sort((a, b) => a.order_index - b.order_index);

  // Selected plan calculation for the checkout modal
  const selectedCycleInfo = getCycleInfo(billingCycle);
  const targetBasePrice = selectedPlan ? (selectedPlan.price || 0) : 0;
  const regularTotal = targetBasePrice * selectedCycleInfo.months;
  const planCyclePrice = Math.round(targetBasePrice * selectedCycleInfo.months * selectedCycleInfo.discount);
  const cycleDiscountSavings = regularTotal - planCyclePrice;

  // Prorated credit applies when upgrading or changing from an active plan
  const applicableCredit = (selectedPlan && selectedPlan.id !== normalizedActivePlan && creditRemaining > 0)
    ? Math.min(planCyclePrice, creditRemaining)
    : 0;

  const netAmountToPay = Math.max(0, planCyclePrice - applicableCredit);
  const amountInCents = netAmountToPay * 100;

  const modalContent = selectedPlan ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPlan(null)} />
      <div className="relative w-full max-w-lg bg-background dark:bg-[#0d1117] border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border/40 bg-muted/30">
          <div className="p-2.5 bg-primary/15 rounded-xl border border-primary/20 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-foreground">Resumen de Compra</h2>
            <p className="text-muted-foreground text-xs">
              Mejora a Plan {selectedPlan.name} • Facturación {selectedCycleInfo.name}
            </p>
          </div>
          <button 
            onClick={() => setSelectedPlan(null)} 
            className="text-muted-foreground hover:text-foreground text-2xl leading-none px-2 rounded-lg hover:bg-muted transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Breakdown Box */}
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="font-bold text-foreground text-base">Plan {selectedPlan.name}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                {selectedCycleInfo.name} ({selectedCycleInfo.months} {selectedCycleInfo.months === 1 ? 'mes' : 'meses'})
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Precio regular ({selectedCycleInfo.months} {selectedCycleInfo.months === 1 ? 'mes' : 'meses'})</span>
                <span>{formatCOP(regularTotal)}</span>
              </div>

              {cycleDiscountSavings > 0 && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Descuento {selectedCycleInfo.name} ({selectedCycleInfo.discountText})
                  </span>
                  <span>-{formatCOP(cycleDiscountSavings)}</span>
                </div>
              )}

              {applicableCredit > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Abono Plan {getPlanLabel(normalizedActivePlan)} ({curCycle.name} • {remainingDays} {remainingDays === 1 ? 'día' : 'días'} restantes)
                    </span>
                    <span>-{formatCOP(applicableCredit)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 pl-4.5">
                    Se descuenta el valor de tu plan actual ({curCycle.name}) para pagar únicamente el excedente.
                  </p>
                </div>
              )}
            </div>

            {/* Total Neto */}
            <div className="pt-3 border-t border-border/40 flex justify-between items-baseline">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total a Pagar</p>
                <p className="text-xs text-muted-foreground">IVA y costos de plataforma incluidos</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  {formatCOP(netAmountToPay)}
                </span>
                <span className="text-xs text-muted-foreground block">COP</span>
              </div>
            </div>
          </div>

          {/* Payment execution */}
          {netAmountToPay === 0 ? (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                ¡Tu saldo a favor cubre el costo total de esta actualización! No se requiere ningún cobro adicional.
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handlePaymentSuccess(selectedPlan.id, billingCycle, '0')}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Confirmar Cambio de Plan Gratis
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex bg-muted/60 p-1 rounded-xl">
                <button 
                  onClick={() => setPaymentMode('manual')}
                  className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${paymentMode === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Pago Único (PSE, Nequi, Tarjetas)
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
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Ingresa los datos de tu tarjeta. Se cobrará {formatCOP(netAmountToPay)} COP de forma segura.
                  </p>
                  <div className="flex justify-center py-1">
                    <WompiSubscriptionForm
                      planId={selectedPlan.id}
                      workshopId={workshopId}
                      userEmail={userEmail}
                      userName={userName}
                      amountToPay={amountInCents}
                      onSuccess={() => {
                        setSelectedPlan(null);
                        handlePaymentSuccess(selectedPlan.id, billingCycle, String(netAmountToPay));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Paga con PSE, Nequi, Tarjeta o Bancolombia a través de la pasarela segura de Wompi.
                  </p>
                  <div className="flex justify-center">
                    <WompiButton
                      amountInCents={amountInCents}
                      reference={`SUB-UPG-${userId}-${Date.now().toString(36).toUpperCase()}`}
                      customerEmail={userEmail}
                      customerName={userName}
                      redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/subscription?payment=success&plan=${selectedPlan.id}&cycle=${billingCycle}&amount=${netAmountToPay}`}
                      buttonLabel={`Pagar ${formatCOP(netAmountToPay)} con Wompi`}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-muted-foreground/60 text-xs pt-1">
                    <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Pago cifrado SSL</span>
                    <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Pasarela oficial Wompi</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-10 pb-12 overflow-hidden">
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Gestionar Suscripción</h1>
        <p className="text-muted-foreground text-lg">
          Tu plan actual es <span className={`font-semibold capitalize ${plans.find(p => p.id === normalizedActivePlan)?.accentText || 'text-primary'}`}>{getPlanLabel(activePlan)}</span>
        </p>
      </div>


      {/* Billing Cycle Toggle */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-muted/60 p-1.5 rounded-full inline-flex border border-border/50 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
              billingCycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('biannual')}
            className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${
              billingCycle === 'biannual' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semestral <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">-10%</span>
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all relative ${
              billingCycle === 'yearly' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anual <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">-20%</span>
            {billingCycle !== 'yearly' && (
              <span className="absolute -top-1.5 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {isUpdating && (
        <div className="flex flex-col items-center justify-center p-8 bg-card/30 rounded-2xl border border-border/50 text-center animate-pulse">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-bold">Procesando tu pago...</h3>
          <p className="text-muted-foreground">Por favor espera, estamos actualizando tu cuenta.</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto py-4">
        {sortedPlans.map((plan, index) => {
          const isCurrent = plan.id === normalizedActivePlan;
          const orderClass = getPlanOrder(plan.id, index);
          const currentCycle = getCycleInfo(billingCycle);
          const basePrice = plan.price;
          const grossCyclePrice = Math.round(basePrice * currentCycle.months * currentCycle.discount);
          const monthlyEquivalent = Math.round(grossCyclePrice / currentCycle.months);
          const hasDiscount = currentCycle.months > 1;
          
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col gap-6 rounded-2xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 transition-all duration-300 ${isCurrent ? 'ring-2 ring-primary shadow-2xl scale-105 z-10 md:scale-110' : 'hover:scale-[1.02] hover:shadow-2xl opacity-90 hover:opacity-100'} ${plan.badge === 'MÁS POPULAR' && !isCurrent ? 'ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10' : ''} ${orderClass}`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold text-primary-foreground bg-primary shadow-lg shadow-primary/30 uppercase tracking-wider">
                    Plan Actual
                  </span>
                </div>
              )}
              {plan.badge && !isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-foreground bg-gradient-to-r ${plan.id === 'pro' ? 'from-amber-500 to-orange-500' : 'from-purple-600 to-purple-500'}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="space-y-1 pt-2">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                {hasDiscount && (
                  <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium">
                    ✓ Ahorra {currentCycle.discountText} en {currentCycle.name}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">{formatCOP(grossCyclePrice)}</span>
                </div>
                <p className={`text-sm mt-0.5 ${plan.accentText}`}>{currentCycle.label}</p>
                {currentCycle.months > 1 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {formatCOP(monthlyEquivalent)}/mes
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {sortedFeatures.map(f => {
                  const value = f[`included_in_${plan.id}`];
                  const isNo = !value || value.toLowerCase() === 'no';
                  const isYes = value && value.toLowerCase() === 'sí';
                  const hasBadge = !isNo && !isYes && value;

                  // Determine colors based on the plan ID
                  const checkColor = plan.id === 'pro' ? 'text-amber-500' : plan.id === 'full' ? 'text-purple-500' : 'text-primary';
                  const badgeColor = plan.id === 'pro' 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                    : plan.id === 'full' 
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                      : 'bg-primary/10 text-primary border border-primary/20';

                  return (
                    <li key={f.id} className={`flex items-start gap-2 text-sm ${isNo ? 'text-muted-foreground/60' : 'text-foreground/90'}`}>
                      {isNo ? (
                        <X className="h-4 w-4 mt-0.5 text-destructive/60 shrink-0" />
                      ) : (
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${checkColor}`} />
                      )}
                      <div className="flex flex-col">
                        <span className={isNo ? 'line-through decoration-muted-foreground/40' : ''}>{f.feature_name}</span>
                        {hasBadge && (
                          <span className={`w-fit text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md mt-0.5 ${badgeColor}`}>
                            {value}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {plan.id === 'full' && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex gap-2">
                  <Gift className="h-4 w-4 text-red-400 shrink-0" />
                  <div>
                    <span className="font-bold text-red-400">BONO FULL TALLER:</span> Soporte prioritario VIP y todas las funciones ilimitadas.
                  </div>
                </div>
              )}

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

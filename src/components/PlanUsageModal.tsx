'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, MessageCircle, Users, CheckCircle2, Lock, Infinity as InfinityIcon, ArrowUpCircle, AlertCircle, UserCircle, Bike, ClipboardList, Package, Wrench, DollarSign, Calculator, Calendar, Wrench as Tool } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPlanUsage } from '@/actions/usage';

interface PlanUsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any; // The current plan object from DEFAULT_PLANS
}

export function PlanUsageModal({ open, onOpenChange, plan: propPlan }: PlanUsageModalProps) {
  const [plan, setPlan] = useState<any>(propPlan);
  const [currentConsumptions, setCurrentConsumptions] = useState({
    messages: 0,
    users: 0,
    clients: 0,
    motorcycles: 0,
    work_orders: 0,
    inventory: 0,
    services: 0,
    sales: 0,
  });
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    if (!open || !propPlan) return;
    setPlan(propPlan);
    const fetchRealPlanAndUsage = async () => {
      try {
        setIsLoadingUsage(true);
        const supabase = createClient();
        // Fetch plan overrides from DB
        const { data } = await supabase.from('subscription_plans').select('*').eq('id', propPlan.id).single();
        if (data) {
          setPlan({ ...propPlan, ...data });
        }
        
        // Fetch real usage from DB
        const usageResponse = await getPlanUsage();
        if (usageResponse?.success && usageResponse.data) {
           setCurrentConsumptions(usageResponse.data);
        }
      } catch (err) {
        console.error('Error fetching real plan and usage:', err);
      } finally {
        setIsLoadingUsage(false);
      }
    };
    fetchRealPlanAndUsage();
  }, [open, propPlan]);

  if (!plan) return null;

  const getProgressColor = (percent: number) => {
    if (percent >= 95) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (percent >= 80) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
  };

  const limits = [
    { key: 'whatsapp_limit', label: 'Mensajes de WhatsApp', icon: MessageCircle, current: currentConsumptions.messages },
    { key: 'users_limit', label: 'Usuarios Activos', icon: Users, current: currentConsumptions.users },
    { key: 'clients_limit', label: 'Clientes', icon: UserCircle, current: currentConsumptions.clients },
    { key: 'motorcycles_limit', label: 'Motocicletas', icon: Bike, current: currentConsumptions.motorcycles },
    { key: 'work_orders_limit', label: 'Órdenes de Trabajo', icon: ClipboardList, current: currentConsumptions.work_orders },
    { key: 'inventory_limit', label: 'Inventario (Items)', icon: Package, current: currentConsumptions.inventory },
    { key: 'services_limit', label: 'Servicios', icon: Wrench, current: currentConsumptions.services },
    { key: 'sales_limit', label: 'Ventas', icon: DollarSign, current: currentConsumptions.sales },
  ];
  const getPlanColor = () => {
    if (plan.id === 'pro') return 'text-amber-500';
    if (plan.id === 'full') return 'text-purple-500';
    return 'text-blue-500';
  };

  const getPlanBgColor = () => {
    if (plan.id === 'pro') return 'bg-amber-500/10 border-amber-500/20';
    if (plan.id === 'full') return 'bg-purple-500/10 border-purple-500/20';
    return 'bg-blue-500/10 border-blue-500/20';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-0 rounded-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
        
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-start justify-between mb-2 pr-6">
            <DialogTitle className="text-2xl font-bold flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Crown className={`w-6 h-6 ${getPlanColor()}`} />
                Plan <span className={getPlanColor()}>{plan.name}</span>
              </div>
            </DialogTitle>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Costo mensual</span>
              <span className="text-base font-bold text-foreground">
                ${(plan.price || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">COP</span>
              </span>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground">
            Detalle del consumo y límites de tu suscripción actual.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4">
          {/* Progress Section */}
          <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/50 hover:[&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
            {limits.map((limit) => {
              const Icon = limit.icon;
              const maxLimit = plan[limit.key] || 0;
              // If limit property doesn't exist on plan, default to 0. It means no access if 0, or unlimited if -1.
              const isUnlimited = maxLimit === -1;
              const hasAccess = maxLimit !== 0;
              const percent = maxLimit > 0 ? Math.min(100, (limit.current / maxLimit) * 100) : 0;
              const showProgress = !isUnlimited && maxLimit > 0;

              if (!hasAccess) return null; // Only show limits if plan has access to them (limit != 0)

              return (
                <div key={limit.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className={`p-1.5 rounded-lg ${getPlanBgColor()}`}>
                        <Icon className={`w-4 h-4 ${getPlanColor()}`} />
                      </div>
                      {limit.label}
                    </div>
                    <span className="font-bold">
                      {isUnlimited ? (
                        <span className="flex items-center text-green-500"><InfinityIcon className="w-4 h-4 mr-1" /> Ilimitado</span>
                      ) : (
                        <span className={percent >= 95 ? 'text-red-500 flex items-center gap-1' : ''}>
                          {percent >= 95 && <AlertCircle className="w-3.5 h-3.5" />}
                          {limit.current} / {maxLimit}
                        </span>
                      )}
                    </span>
                  </div>
                  {showProgress && (
                    <div className={`h-2.5 w-full rounded-full overflow-hidden border ${getPlanBgColor()}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percent)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modules Section */}
          <div className={`rounded-xl p-3 border ${getPlanBgColor()}`}>
            <h4 className={`text-sm font-semibold mb-2 ${getPlanColor()}`}>Módulos Incluidos</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {plan.has_inventory ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground/50" />}
                <span className={plan.has_inventory ? 'text-foreground' : 'text-muted-foreground/50'}>Inventario</span>
              </div>
              <div className="flex items-center gap-2">
                {plan.has_sales ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground/50" />}
                <span className={plan.has_sales ? 'text-foreground' : 'text-muted-foreground/50'}>Ventas y Caja</span>
              </div>
              <div className="flex items-center gap-2">
                {plan.has_appointments ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground/50" />}
                <span className={plan.has_appointments ? 'text-foreground' : 'text-muted-foreground/50'}>Citas y Agenda</span>
              </div>
              <div className="flex items-center gap-2">
                {plan.has_technicians ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground/50" />}
                <span className={plan.has_technicians ? 'text-foreground' : 'text-muted-foreground/50'}>Técnicos</span>
              </div>
              <div className="flex items-center gap-2">
                {plan.has_accounting ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground/50" />}
                <span className={plan.has_accounting ? 'text-foreground' : 'text-muted-foreground/50'}>Contabilidad</span>
              </div>
            </div>
          </div>

          {/* Upgrade Action */}
          {plan.id !== 'full' && (
            <div className="pt-2">
              <Link href="/dashboard/subscription" onClick={() => onOpenChange(false)}>
                <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg font-semibold flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5" />
                  Mejorar Plan
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

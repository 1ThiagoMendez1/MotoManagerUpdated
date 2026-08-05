'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, MessageCircle, Users, CheckCircle2, Lock, Infinity as InfinityIcon, ArrowUpCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PlanUsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any; // The current plan object from DEFAULT_PLANS
}

export function PlanUsageModal({ open, onOpenChange, plan }: PlanUsageModalProps) {
  if (!plan) return null;

  // Mocked consumption for demonstration purposes
  const currentUsers = 1;
  const currentMessages = 45; // Simulating 45 messages consumed

  // Calculations for Progress Bars
  const usersPercent = plan.users_limit > 0 ? Math.min(100, (currentUsers / plan.users_limit) * 100) : 0;
  const messagesPercent = plan.whatsapp_limit > 0 ? Math.min(100, (currentMessages / plan.whatsapp_limit) * 100) : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 95) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (percent >= 80) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
  };

  const isUnlimitedMessages = plan.whatsapp_limit === -1;
  const isUnlimitedUsers = plan.users_limit === -1;

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
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Crown className={`w-6 h-6 ${getPlanColor()}`} />
              Plan <span className={getPlanColor()}>{plan.name}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Detalle del consumo y límites de tu suscripción actual.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          {/* Progress Section */}
          <div className="space-y-4">
            
            {/* Mensajes WhatsApp */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <div className={`p-1.5 rounded-lg ${getPlanBgColor()}`}>
                    <MessageCircle className={`w-4 h-4 ${getPlanColor()}`} />
                  </div>
                  Mensajes de WhatsApp
                </div>
                <span className="font-bold">
                  {isUnlimitedMessages ? (
                    <span className="flex items-center text-green-500"><InfinityIcon className="w-4 h-4 mr-1" /> Ilimitado</span>
                  ) : (
                    <span className={messagesPercent >= 95 ? 'text-red-500 flex items-center gap-1' : ''}>
                      {messagesPercent >= 95 && <AlertCircle className="w-3.5 h-3.5" />}
                      {currentMessages} / {plan.whatsapp_limit}
                    </span>
                  )}
                </span>
              </div>
              {!isUnlimitedMessages && (
                <div className={`h-2.5 w-full rounded-full overflow-hidden border ${getPlanBgColor()}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(messagesPercent)}`}
                    style={{ width: `${messagesPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Usuarios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <div className={`p-1.5 rounded-lg ${getPlanBgColor()}`}>
                    <Users className={`w-4 h-4 ${getPlanColor()}`} />
                  </div>
                  Usuarios Activos
                </div>
                <span className="font-bold">
                  {isUnlimitedUsers ? (
                    <span className="flex items-center text-green-500"><InfinityIcon className="w-4 h-4 mr-1" /> Ilimitado</span>
                  ) : (
                    <span className={usersPercent >= 95 ? 'text-red-500 flex items-center gap-1' : ''}>
                      {usersPercent >= 95 && <AlertCircle className="w-3.5 h-3.5" />}
                      {currentUsers} / {plan.users_limit}
                    </span>
                  )}
                </span>
              </div>
              {!isUnlimitedUsers && (
                <div className={`h-2.5 w-full rounded-full overflow-hidden border ${getPlanBgColor()}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(usersPercent)}`}
                    style={{ width: `${usersPercent}%` }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Modules Section */}
          <div className={`rounded-xl p-4 border ${getPlanBgColor()}`}>
            <h4 className={`text-sm font-semibold mb-3 ${getPlanColor()}`}>Módulos Incluidos</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
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

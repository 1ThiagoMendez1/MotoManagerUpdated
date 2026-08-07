'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  LogOut,
  ArrowLeft,
  Home,
  Crown,
  CalendarDays,
  ArrowUpCircle,
  Settings,
  Bell
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants/plans';
import { PlanUsageModal } from './PlanUsageModal';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ColombiaClock } from '@/components/ColombiaClock';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  workshopName?: string | null;
  workshopSlug?: string | null;
  userName?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionStatus?: string | null;
  workshopCreatedAt?: string | null;
  userRole?: string | null;
}

export default function Header({ 
  workshopName, 
  workshopSlug,
  userName,
  subscriptionPlan,
  subscriptionEndDate,
  subscriptionStatus,
  workshopCreatedAt,
  userRole
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showPlanUsageModal, setShowPlanUsageModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && userName) {
      const stored = localStorage.getItem(`motomanager_read_notifications_${userName}`);
      if (stored) {
        try {
          setReadIds(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing read notifications from localStorage', e);
        }
      }
    }
  }, [userName]);

  useEffect(() => {
    if (!userName) return;

    const fetchNotifications = async () => {
      try {
        const { getNotificationsForUser } = await import('@/lib/actions/notifications');
        const res = await getNotificationsForUser();
        if (res.success && res.data) {
          let currentReadIds: string[] = [];
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`motomanager_read_notifications_${userName}`);
            if (stored) {
              try {
                currentReadIds = JSON.parse(stored);
              } catch (e) {}
            }
          }
          const filtered = res.data.filter((n: any) => !currentReadIds.includes(n.id));
          setNotifications(filtered);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userName]);

  const markAsRead = (id: string) => {
    const updatedReadIds = Array.from(new Set([...readIds, id])).slice(-100);
    setReadIds(updatedReadIds);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`motomanager_read_notifications_${userName}`, JSON.stringify(updatedReadIds));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    const currentIds = notifications.map((n) => n.id);
    const updatedReadIds = Array.from(new Set([...readIds, ...currentIds])).slice(-100);
    setReadIds(updatedReadIds);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`motomanager_read_notifications_${userName}`, JSON.stringify(updatedReadIds));
    }
    setNotifications([]);
  };

  const isRoot = pathname === '/' || pathname === '/login' || pathname === '/register-workshop' || pathname === '/admin' || (!!workshopSlug && pathname === `/${workshopSlug}`);

  const handleSignOut = async () => {
    try {
      const { signOutAction } = await import('@/lib/actions/auth');
      await signOutAction();
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && (error.message as string).includes('NEXT_REDIRECT')) {
        // Redirection thrown by Next.js, expected behavior
      } else {
        console.error('Error during logout:', error);
        window.location.href = '/login';
      }
    }
  };

  const getPlanName = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    switch (p) {
      case 'monthly': return 'Mensual';
      case 'biannual': return 'Semestral';
      case 'yearly': return 'Anual';
      case 'basic': return 'Básico';
      case 'pro': return 'Pro';
      case 'full': return 'Full';
      default: return plan ? plan : 'Gratis';
    }
  };

  const getPlanColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'text-yellow-500';
    if (p.includes('full')) return 'text-red-500';
    if (p.includes('basic')) return 'text-blue-500';
    return 'text-primary';
  };

  const getPlanBgColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'bg-yellow-500/10';
    if (p.includes('full')) return 'bg-red-500/10';
    if (p.includes('basic')) return 'bg-blue-500/10';
    return 'bg-primary/10';
  };

  const getPlanGlowColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'group-hover:bg-yellow-500/20';
    if (p.includes('full')) return 'group-hover:bg-red-500/20';
    if (p.includes('basic')) return 'group-hover:bg-blue-500/20';
    return 'group-hover:bg-primary/20';
  };

  const getPlanBorderColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'border-yellow-500/30';
    if (p.includes('full')) return 'border-red-500/30';
    if (p.includes('basic')) return 'border-blue-500/30';
    return 'border-border/50';
  };

  const getPlanHoverBorderColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'hover:border-yellow-500/50';
    if (p.includes('full')) return 'hover:border-red-500/50';
    if (p.includes('basic')) return 'hover:border-blue-500/50';
    return 'hover:border-primary/30';
  };

  const getPlanShadowColor = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return 'shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]';
    if (p.includes('full')) return 'shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]';
    if (p.includes('basic')) return 'shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]';
    return 'shadow-sm';
  };

  const getCalculatedEndDate = () => {
    if (subscriptionEndDate) return subscriptionEndDate;
    if (!workshopCreatedAt) return null;

    const startDate = new Date(workshopCreatedAt);
    let monthsToAdd = 0;

    const p = subscriptionPlan?.toLowerCase() || '';
    switch (p) {
      case 'monthly':
      case 'basic':
      case 'pro':
      case 'full':
        monthsToAdd = 1;
        break;
      case 'biannual':
        monthsToAdd = 6;
        break;
      case 'yearly':
        monthsToAdd = 12;
        break;
      default: return null; // Si no hay plan reconocido, no hay expiración calculada
    }

    startDate.setMonth(startDate.getMonth() + monthsToAdd);
    return startDate.toISOString();
  };

  const calculatedEndDate = getCalculatedEndDate();

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between py-1 px-4 sm:px-6 text-foreground z-50">
      <div className="flex items-center gap-2 sm:gap-4">
        {!isRoot && (
          <Button
            onClick={() => {
              if (pathname.startsWith('/clientes') || pathname.startsWith('/cotizacion')) {
                const searchParams = new URLSearchParams(window.location.search);
                const authParam = searchParams.get('auth');
                router.push(authParam ? `/clientes?auth=${authParam}` : '/clientes');
              } else {
                router.push(pathname.startsWith('/admin') ? '/admin' : (workshopSlug ? `/${workshopSlug}` : '/dashboard'));
              }
            }}
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-card/50 h-9 w-9 rounded-full transition-transform hover:scale-110"
            title="Ir a inicio"
          >
            <Home className="h-5 w-5" />
          </Button>
        )}
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (pathname.startsWith('/clientes') || pathname.startsWith('/cotizacion')) {
              const searchParams = new URLSearchParams(window.location.search);
              const authParam = searchParams.get('auth');
              router.push(authParam ? `/clientes?auth=${authParam}` : '/clientes');
            } else {
              router.push(pathname.startsWith('/admin') ? '/admin' : (workshopSlug ? `/${workshopSlug}` : '/dashboard'));
            }
          }}
          className="flex items-center gap-3 font-semibold hover:opacity-80 transition-opacity"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 drop-shadow-md">
            <Image 
              src="/logo.png" 
              alt="MotoManager Logo" 
              fill
              sizes="(max-width: 768px) 100vw, 20vw"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-foreground hidden sm:flex items-center">
            <span className="font-space font-bold text-xl tracking-tight">MotoManager</span>
            {pathname === '/admin' ? (
              <span className="text-red-500 font-bold text-xl ml-2">ADMIN</span>
            ) : workshopName ? (
              <span className="text-primary font-bold text-xl ml-2">| {workshopName}</span>
            ) : null}
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">

        <ColombiaClock />
        <ThemeToggle />
        
        {/* Notificaciones y Perfil (solo si hay sesión) */}
        {userName && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-card/50 h-9 w-9">
                  <Bell className="h-5 w-5 text-foreground/80" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 border border-white/10 shadow-2xl rounded-xl overflow-hidden bg-background/95 backdrop-blur-xl">
                <div className="bg-muted/50 p-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notificaciones</h3>
                  <span className="text-xs text-primary cursor-pointer hover:underline" onClick={markAllAsRead}>Marcar leídas</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {notifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-white/5 transition-colors focus:bg-white/5 focus:text-foreground text-foreground"
                          onClick={() => {
                            markAsRead(notif.id);
                            if (notif.link) {
                              router.push(notif.link);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${notif.urgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`} />
                            <span className="font-semibold text-xs text-muted-foreground">{notif.time}</span>
                          </div>
                          <p className="text-sm font-medium leading-snug">{notif.text}</p>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <Bell className="h-8 w-8 opacity-20" />
                      <p className="text-sm">No hay notificaciones nuevas</p>
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-white/5 bg-muted/20 text-center">
                  <Button variant="ghost" className="text-xs w-full h-8 text-primary hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
                    Ver todas en el Dashboard
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-card/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium border border-primary/20">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block font-medium text-sm">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80 p-0 border border-white/10 shadow-2xl rounded-xl overflow-hidden bg-background/95 backdrop-blur-xl">
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{userName}</h3>
                      <p className="text-xs text-muted-foreground truncate">{workshopName || 'Taller'}</p>
                    </div>
                  </div>
                </div>

                {/* Plan Info Card */}
                {userRole === 'owner' && subscriptionPlan && (
                  <div className="p-3">
                    <DropdownMenuItem 
                      className="!p-0 !m-0 !bg-transparent !border-none !outline-none focus:!bg-transparent data-[highlighted]:!bg-transparent w-full cursor-pointer block"
                      onSelect={(e) => {
                        e.preventDefault();
                        // Utilizamos un pequeño retraso para permitir que el DropdownMenu limpie sus locks del DOM
                        // antes de que el Dialog intente aplicar los suyos. Esto evita el bug de la pantalla congelada.
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Forzamos el cierre del menú
                        setTimeout(() => setShowPlanUsageModal(true), 50);
                      }}
                    >
                      <div 
                        className={`w-full block text-left bg-card/50 border ${getPlanBorderColor(subscriptionPlan)} rounded-lg p-3 relative overflow-hidden group ${getPlanHoverBorderColor(subscriptionPlan)} transition-all hover:scale-[1.02] cursor-pointer ${getPlanShadowColor(subscriptionPlan)}`}
                      >
                        {/* Subtle shine effect */}
                        <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 ${getPlanBgColor(subscriptionPlan)} rounded-full blur-xl transition-all ${getPlanGlowColor(subscriptionPlan)}`}></div>
                        
                        <div className="flex items-center justify-between mb-3 relative z-10">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Crown className={`w-4 h-4 ${getPlanColor(subscriptionPlan)}`} />
                            Plan <span className={getPlanColor(subscriptionPlan)}>{getPlanName(subscriptionPlan)}</span>
                          </div>
                          {subscriptionStatus === 'active' ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                              Activo
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              {subscriptionStatus}
                            </span>
                          )}
                          
                          {/* Indicador de Alerta de Consumo Simulada (ejemplo: si el plan no es ilimitado y el consumo es alto) */}
                          {subscriptionPlan && getPlanLimits(subscriptionPlan)?.whatsapp_limit > 0 && 45 / getPlanLimits(subscriptionPlan).whatsapp_limit >= 0.9 && (
                            <div className="absolute top-0 right-14 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Límites casi agotados" />
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Vence: <span className="font-medium text-foreground">{formatDate(calculatedEndDate)}</span></span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                )}

                <div className="px-3 pb-2 flex flex-col gap-2">
                  <Link href="/dashboard/profile" className="block w-full">
                    <Button variant="outline" className="w-full text-xs h-9 border-primary/20 hover:bg-primary/5 transition-all">
                      <Settings className="w-4 h-4 mr-2" />
                      Actualizar Datos
                    </Button>
                  </Link>
                  {userRole === 'owner' && (
                    <Link href="/dashboard/subscription" className="block w-full">
                      <Button variant="default" className="w-full text-xs h-9 bg-primary/90 hover:bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.25)] transition-all">
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        Mejorar o Cambiar Plan
                      </Button>
                    </Link>
                  )}
                </div>

                <DropdownMenuSeparator className="bg-border/50 m-0" />
                
                <div className="p-1.5 bg-muted/20">
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2 rounded-md p-2 transition-colors">
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium text-sm">Cerrar Sesión</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Plan Usage Modal */}
            {userRole === 'owner' && subscriptionPlan && (
              <PlanUsageModal 
                open={showPlanUsageModal} 
                onOpenChange={setShowPlanUsageModal} 
                plan={getPlanLimits(subscriptionPlan)} 
              />
            )}
          </>
        )}
      </div>
    </header>
  );
}
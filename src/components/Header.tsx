'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  LogOut,
  ArrowLeft,
  Crown,
  CalendarDays,
  ArrowUpCircle,
  Settings,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  workshopName?: string | null;
  userName?: string | null;
  subscriptionPlan?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionStatus?: string | null;
  workshopCreatedAt?: string | null;
  userRole?: string | null;
}

export default function Header({ 
  workshopName, 
  userName,
  subscriptionPlan,
  subscriptionEndDate,
  subscriptionStatus,
  workshopCreatedAt,
  userRole
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isRoot = pathname === '/' || pathname === '/login' || pathname === '/register-workshop' || pathname === '/admin';

  const handleSignOut = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Force a full page reload to clear all server component state/cache
      window.location.href = '/planes';
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect to landing even if logout fails
      router.push('/planes');
    }
  };

  const getPlanName = (plan?: string | null) => {
    switch (plan) {
      case 'monthly': return 'Mensual';
      case 'biannual': return 'Semestral';
      case 'yearly': return 'Anual';
      default: return plan ? plan : 'Gratis';
    }
  };

  const getCalculatedEndDate = () => {
    if (subscriptionEndDate) return subscriptionEndDate;
    if (!workshopCreatedAt) return null;

    const startDate = new Date(workshopCreatedAt);
    let monthsToAdd = 0;

    switch (subscriptionPlan) {
      case 'monthly': monthsToAdd = 1; break;
      case 'biannual': monthsToAdd = 6; break;
      case 'yearly': monthsToAdd = 12; break;
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
            onClick={() => router.back()}
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-card/50 h-9 w-9 rounded-full transition-transform hover:-translate-x-1"
            title="Volver atrás"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Link
          href={pathname.startsWith('/admin') ? '/admin' : '/'}
          className="flex items-center gap-3 font-semibold hover:opacity-80 transition-opacity"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 drop-shadow-md">
            <Image 
              src="/logo.png" 
              alt="MotoManager Logo" 
              fill
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

        <ThemeToggle />
        
        {/* Notificaciones y Perfil (solo si hay sesión) */}
        {userName && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-card/50 h-9 w-9">
                  <Bell className="h-5 w-5 text-foreground/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 border border-white/10 shadow-2xl rounded-xl overflow-hidden bg-background/95 backdrop-blur-xl">
                <div className="bg-muted/50 p-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notificaciones</h3>
                  <span className="text-xs text-primary cursor-pointer hover:underline">Marcar leídas</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Bell className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No hay notificaciones nuevas</p>
                  </div>
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
                    <div className="bg-card/50 border border-border/50 rounded-lg p-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
                      {/* Subtle shine effect */}
                      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-primary/10 rounded-full blur-xl transition-all group-hover:bg-primary/20"></div>
                      
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Crown className="w-4 h-4 text-primary" />
                          Plan {getPlanName(subscriptionPlan)}
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
                      </div>
                      
                      <div className="flex flex-col gap-2 relative z-10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Vence: <span className="font-medium text-foreground">{formatDate(calculatedEndDate)}</span></span>
                        </div>
                      </div>
                    </div>
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
          </>
        )}
      </div>
    </header>
  );
}
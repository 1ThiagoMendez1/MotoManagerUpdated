'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Wrench,
  LogOut,
  LifeBuoy,
  Bell,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CreateTicket } from '@/components/forms/CreateTicket';
import TenantSwitcher from '@/components/TenantSwitcher';
import { getTenantAwareHref } from '@/lib/navigation';

const notifications = [
    { title: "Ticket Actualizado", description: "Tu ticket #TKT-001 ha sido marcado como 'En Revisión'.", time: "hace 5 min" },
    { title: "Bajo Stock", description: "El artículo 'Pastillas de Freno (Par)' tiene solo 8 unidades.", time: "hace 2 horas" },
    { title: "Cita Próxima", description: "Recuerda la cita para la Yamaha MT-07 mañana a las 10:00.", time: "hace 1 día" },
];

export default function Header() {
  const router = useRouter();
  const [homeHref, setHomeHref] = useState('/');

  useEffect(() => {
    getTenantAwareHref('/').then(setHomeHref);
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('tenantId');

      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect to login even if logout fails
      router.push('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 text-white z-50">
      <div className="flex items-center gap-4">
        <Link href={homeHref} className="flex items-center gap-2 font-semibold text-lg">
          <Wrench className="h-6 w-6 text-primary" />
          <span className="text-white hidden sm:inline">MotoManager</span>
          <span className="text-white sm:hidden">MM</span>
        </Link>
        <TenantSwitcher />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative p-2 rounded-md hover:bg-white/10">
                <Bell className="h-5 w-5 text-white" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notif, index) => (
                <DropdownMenuItem key={index} className="flex flex-col items-start gap-1 whitespace-normal">
                  <p className="font-semibold">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.description}</p>
                  <p className="text-xs text-muted-foreground/80 self-end">{notif.time}</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <CreateTicket>
              <Button variant="ghost" className="p-2 rounded-md hover:bg-white/10">
                  <LifeBuoy className="h-5 w-5 text-white" />
                  <span className="ml-2 hidden md:inline">Soporte</span>
              </Button>
          </CreateTicket>
           <Button onClick={handleSignOut} variant="ghost" className="p-2 rounded-md hover:bg-white/10">
              <LogOut className="h-5 w-5 text-white" />
              <span className="ml-2 hidden md:inline">Cerrar Sesión</span>
           </Button>
      </div>
    </header>
  );
}
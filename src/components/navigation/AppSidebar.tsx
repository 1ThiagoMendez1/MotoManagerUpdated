'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Package,
  ShoppingCart,
  Users,
  Bike,
  Calendar,
  Wrench,
  DollarSign,
  LayoutDashboard,
  Shield,
  LifeBuoy,
  Sparkles,
  Home,
  ChevronRight,
  Crown
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { hasPermission } from '@/lib/permissions';
import { getPlanLimits } from '@/lib/constants/plans';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppSidebarProps {
  workshopName?: string | null;
  workshopSlug?: string | null;
  userRole?: string | null;
  customPermissions?: string[] | null;
  subscriptionPlan?: string | null;
}

export function AppSidebar({
  workshopName,
  workshopSlug,
  userRole = 'owner',
  customPermissions,
  subscriptionPlan = 'monthly',
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const role = userRole || 'owner';
  const planLimits = getPlanLimits(subscriptionPlan || 'basic');

  const groups = [
    {
      title: 'Operación',
      items: [
        { title: 'Órdenes de Trabajo', url: '/work-orders', icon: FileText, id: 'sidebar-nav-work-orders' },
        { title: 'Citas y Agenda', url: '/appointments', icon: Calendar, id: 'sidebar-nav-appointments' },
        { title: 'Técnicos', url: '/technicians', icon: Wrench, id: 'sidebar-nav-technicians' },
      ],
    },
    {
      title: 'Clientes & Vehículos',
      items: [
        { title: 'Clientes', url: '/customers', icon: Users, id: 'sidebar-nav-customers' },
        { title: 'Motocicletas', url: '/motorcycles', icon: Bike, id: 'sidebar-nav-motorcycles' },
      ],
    },
    {
      title: 'Comercial',
      items: [
        { title: 'Ventas', url: '/sales', icon: ShoppingCart, id: 'sidebar-nav-sales' },
        { title: 'Servicios', url: '/services', icon: Wrench, id: 'sidebar-nav-services' },
      ],
    },
    {
      title: 'Inventario',
      items: [
        { title: 'Inventario', url: '/inventory', icon: Package, id: 'sidebar-nav-inventory' },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, id: 'sidebar-nav-dashboard' },
        { title: 'Contabilidad', url: '/accounting', icon: DollarSign, id: 'sidebar-nav-accounting' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { title: 'Equipo y Permisos', url: '/team', icon: Shield, id: 'sidebar-nav-team' },
        { title: 'Tickets de Soporte', url: '/tickets', icon: LifeBuoy, id: 'sidebar-nav-tickets' },
      ],
    },
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getPlanBadge = (plan?: string | null) => {
    const p = plan?.toLowerCase() || '';
    if (p.includes('pro')) return { text: 'PRO', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    if (p.includes('full')) return { text: 'FULL', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    return { text: 'BÁSICO', className: 'bg-primary/10 text-primary border-primary/30' };
  };

  const planBadge = getPlanBadge(subscriptionPlan);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar transition-all duration-200">
      <SidebarHeader className="h-14 border-b border-border/60 px-3 flex flex-row items-center justify-between">
        <Link
          href={workshopSlug ? `/${workshopSlug}` : '/dashboard'}
          className="flex items-center gap-2.5 overflow-hidden font-semibold transition-opacity hover:opacity-90 w-full"
          onClick={handleLinkClick}
        >
          <div className="relative w-7 h-7 flex-shrink-0 drop-shadow-sm">
            <Image
              src="/logo.png"
              alt="MotoManager"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="font-space font-bold text-sm tracking-tight text-foreground truncate">
              MotoManager
            </span>
            {workshopName && (
              <span className="text-[11px] font-medium text-muted-foreground truncate">
                {workshopName}
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2 overflow-y-auto">
        {/* Enlace al Hub / Panel Principal */}
        <SidebarGroup className="py-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={workshopSlug ? pathname === `/${workshopSlug}` : pathname === '/'}
                tooltip="Inicio / Hub del Taller"
                className="h-9 font-medium"
              >
                <Link 
                  href={workshopSlug ? `/${workshopSlug}` : '/dashboard'} 
                  onClick={handleLinkClick}
                  className="flex items-center gap-2.5"
                >
                  <Home className="w-4 h-4 text-primary" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Panel Principal</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {groups.map((group) => {
          // Filtrar ítems permitidos por el rol del usuario
          const permittedItems = group.items.filter((item) =>
            hasPermission(role, item.url, customPermissions)
          );

          if (permittedItems.length === 0) return null;

          return (
            <SidebarGroup key={group.title} className="py-1.5">
              <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 py-1 group-data-[collapsible=icon]:hidden">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {permittedItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.url || pathname.startsWith(item.url + '/');

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className="h-9 transition-colors font-normal text-sm"
                        >
                          <Link 
                            href={item.url} 
                            onClick={handleLinkClick}
                            id={item.id}
                            className="flex items-center gap-2.5"
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-2.5">
        <div className="flex items-center justify-between gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <Link 
            href="/planes" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={handleLinkClick}
            title="Gestionar Plan"
          >
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-[11px] font-semibold text-foreground">Plan Activo</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 w-fit ${planBadge.className}`}>
                {planBadge.text}
              </Badge>
            </div>
          </Link>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

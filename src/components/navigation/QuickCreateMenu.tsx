'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  ShoppingCart,
  Users,
  Bike,
  Package,
  Calendar,
  Wrench,
  ChevronDown
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
import { hasPermission } from '@/lib/permissions';

interface QuickCreateMenuProps {
  userRole?: string | null;
  customPermissions?: string[] | null;
}

export function QuickCreateMenu({
  userRole = 'owner',
  customPermissions,
}: QuickCreateMenuProps) {
  const router = useRouter();
  const role = userRole || 'owner';

  const canCreateWorkOrder = hasPermission(role, '/work-orders', customPermissions);
  const canCreateSale = hasPermission(role, '/sales', customPermissions);
  const canCreateCustomer = hasPermission(role, '/customers', customPermissions);
  const canCreateMotorcycle = hasPermission(role, '/motorcycles', customPermissions);
  const canCreateInventory = hasPermission(role, '/inventory', customPermissions);
  const canCreateAppointment = hasPermission(role, '/appointments', customPermissions);
  const canCreateService = hasPermission(role, '/services', customPermissions);

  const actions = [
    { label: 'Nueva Orden de Trabajo', path: '/work-orders?new=true', icon: FileText, allowed: canCreateWorkOrder },
    { label: 'Nueva Venta', path: '/sales?new=true', icon: ShoppingCart, allowed: canCreateSale },
    { label: 'Nuevo Cliente', path: '/customers?new=true', icon: Users, allowed: canCreateCustomer },
    { label: 'Nueva Motocicleta', path: '/motorcycles?new=true', icon: Bike, allowed: canCreateMotorcycle },
    { label: 'Nuevo Artículo en Inventario', path: '/inventory?new=true', icon: Package, allowed: canCreateInventory },
    { label: 'Nueva Cita', path: '/appointments?new=true', icon: Calendar, allowed: canCreateAppointment },
    { label: 'Nuevo Servicio', path: '/services?new=true', icon: Wrench, allowed: canCreateService },
  ].filter(a => a.allowed);

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 border border-border/80 shadow-xl rounded-xl bg-popover text-popover-foreground">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1">
          Creación Rápida
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.path + action.label}
              onClick={() => router.push(action.path)}
              className="flex items-center gap-2.5 px-2 py-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-accent hover:text-accent-foreground"
            >
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span>{action.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

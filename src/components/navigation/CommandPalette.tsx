'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
  Sun,
  Moon,
  Home,
  Laptop
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { hasPermission } from '@/lib/permissions';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string | null;
  customPermissions?: string[] | null;
  workshopSlug?: string | null;
}

export function CommandPalette({
  open,
  onOpenChange,
  userRole = 'owner',
  customPermissions,
  workshopSlug,
}: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const role = userRole || 'owner';

  const navigateTo = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const navItems = [
    { label: 'Órdenes de Trabajo', path: '/work-orders', icon: FileText, group: 'Módulos' },
    { label: 'Inventario', path: '/inventory', icon: Package, group: 'Módulos' },
    { label: 'Ventas', path: '/sales', icon: ShoppingCart, group: 'Módulos' },
    { label: 'Clientes', path: '/customers', icon: Users, group: 'Módulos' },
    { label: 'Motocicletas', path: '/motorcycles', icon: Bike, group: 'Módulos' },
    { label: 'Citas y Agenda', path: '/appointments', icon: Calendar, group: 'Módulos' },
    { label: 'Servicios', path: '/services', icon: Wrench, group: 'Módulos' },
    { label: 'Técnicos', path: '/technicians', icon: Wrench, group: 'Módulos' },
    { label: 'Contabilidad', path: '/accounting', icon: DollarSign, group: 'Módulos' },
    { label: 'Dashboard Analítico', path: '/dashboard', icon: LayoutDashboard, group: 'Módulos' },
    { label: 'Equipo y Permisos', path: '/team', icon: Shield, group: 'Administración' },
    { label: 'Tickets de Soporte', path: '/tickets', icon: LifeBuoy, group: 'Administración' },
  ].filter(item => hasPermission(role, item.path, customPermissions));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Escribe un comando o busca un módulo..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        
        <CommandGroup heading="Navegación Rápida">
          <CommandItem
            onSelect={() => navigateTo(workshopSlug ? `/${workshopSlug}` : '/dashboard')}
            className="cursor-pointer"
          >
            <Home className="mr-2 h-4 w-4 text-primary" />
            <span>Panel Principal / Inicio</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Módulos">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.path}
                onSelect={() => navigateTo(item.path)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tema de Interfaz">
          <CommandItem onSelect={() => { setTheme('light'); onOpenChange(false); }} className="cursor-pointer">
            <Sun className="mr-2 h-4 w-4 text-amber-500" />
            <span>Modo Claro</span>
          </CommandItem>
          <CommandItem onSelect={() => { setTheme('dark'); onOpenChange(false); }} className="cursor-pointer">
            <Moon className="mr-2 h-4 w-4 text-blue-400" />
            <span>Modo Oscuro</span>
          </CommandItem>
          <CommandItem onSelect={() => { setTheme('system'); onOpenChange(false); }} className="cursor-pointer">
            <Laptop className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Tema del Sistema</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

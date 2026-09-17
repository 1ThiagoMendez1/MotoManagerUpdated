'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  'work-orders': 'Órdenes de Trabajo',
  'customers': 'Clientes',
  'motorcycles': 'Motocicletas',
  'inventory': 'Inventario',
  'sales': 'Ventas',
  'services': 'Servicios',
  'appointments': 'Citas',
  'technicians': 'Técnicos',
  'accounting': 'Contabilidad',
  'dashboard': 'Dashboard',
  'team': 'Equipo y Permisos',
  'tickets': 'Tickets de Soporte',
  'planes': 'Planes',
  'billing': 'Facturación',
  'profile': 'Perfil',
  'subscription': 'Suscripción',
};

interface BreadcrumbsProps {
  workshopSlug?: string | null;
}

export function Breadcrumbs({ workshopSlug }: BreadcrumbsProps) {
  const pathname = usePathname();

  if (!pathname || pathname === '/' || pathname === '/login') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  
  // Si el primer segmento es el slug del taller (ej: /moto-express), saltarlo en la lista visible
  const isTenantRoot = segments.length === 1 && segments[0] === workshopSlug;
  if (isTenantRoot) {
    return null;
  }

  const filteredSegments = segments.filter(seg => seg !== workshopSlug);

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link 
        href={workshopSlug ? `/${workshopSlug}` : '/dashboard'}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        title="Inicio"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {filteredSegments.map((segment, index) => {
        const isLast = index === filteredSegments.length - 1;
        const segmentPath = `/${segments.slice(0, segments.indexOf(segment) + 1).join('/')}`;
        const label = ROUTE_LABELS[segment] || (segment.startsWith('OT-') || segment.length > 20 ? 'Detalle' : segment);

        return (
          <div key={segmentPath} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[160px]">
                {label}
              </span>
            ) : (
              <Link 
                href={segmentPath} 
                className="hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

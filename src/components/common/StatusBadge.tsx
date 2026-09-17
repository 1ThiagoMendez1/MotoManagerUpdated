import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = (status || '').toLowerCase();

  let variantClass = 'border-border/60 text-muted-foreground bg-muted/20';

  if (s.includes('entregado') || s.includes('finalizado') || s.includes('pagado') || s.includes('completad') || s.includes('aprobado')) {
    variantClass = 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
  } else if (s.includes('reparado') || s.includes('en proceso') || s.includes('confirmad')) {
    variantClass = 'border-primary/30 text-primary bg-primary/10';
  } else if (s.includes('pendiente') || s.includes('diagnost') || s.includes('espera') || s.includes('revision')) {
    variantClass = 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10';
  } else if (s.includes('cancelad') || s.includes('rechazad') || s.includes('anulad') || s.includes('vencid')) {
    variantClass = 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10';
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap shadow-none', variantClass, className)}
    >
      {status}
    </Badge>
  );
}

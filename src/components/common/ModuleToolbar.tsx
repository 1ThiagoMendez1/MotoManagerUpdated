'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface SecondaryAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  component?: React.ReactNode;
  destructive?: boolean;
}

interface ModuleToolbarProps {
  searchComponent?: React.ReactNode;
  filtersComponent?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: SecondaryAction[];
  className?: string;
  children?: React.ReactNode;
}

export function ModuleToolbar({
  searchComponent,
  filtersComponent,
  primaryAction,
  secondaryActions = [],
  className,
  children,
}: ModuleToolbarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4', className)}>
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        {searchComponent && (
          <div className="flex-1 min-w-[200px] max-w-sm">
            {searchComponent}
          </div>
        )}
        {filtersComponent && (
          <div className="flex items-center gap-2">
            {filtersComponent}
          </div>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2 shrink-0 justify-end">
        {primaryAction}

        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border/60 hover:bg-muted"
                title="Más opciones"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1 border-border/80 shadow-lg rounded-xl">
              {secondaryActions.map((action, index) => {
                if (action.component) {
                  return (
                    <div key={index} className="p-1">
                      {action.component}
                    </div>
                  );
                }
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer rounded-md',
                      action.destructive && 'text-destructive focus:bg-destructive/10 focus:text-destructive'
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
